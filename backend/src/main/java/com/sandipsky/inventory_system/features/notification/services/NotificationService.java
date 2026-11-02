package com.sandipsky.inventory_system.features.notification.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.notification.dtos.NotificationDTO;
import com.sandipsky.inventory_system.features.notification.entities.Notification;
import com.sandipsky.inventory_system.features.notification.repositories.NotificationRepository;
import com.sandipsky.inventory_system.features.notification.socket.NotificationSocketHandler;
import com.sandipsky.inventory_system.features.user.entities.User;
import com.sandipsky.inventory_system.features.user.repositories.UserRepository;

// Stores a notification for every user whose role may see what it is about, and pushes it to their
// open sockets. Sending never fails the save that caused it.
@Service
public class NotificationService {

    public static final String INFO = "info";
    public static final String WARN = "warn";
    public static final String ERROR = "error";

    // The feed returns the newest ones only
    static final int FEED_SIZE = 50;

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    @Autowired
    private NotificationRepository repository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationSocketHandler socketHandler;

    @Autowired
    private PlatformTransactionManager transactionManager;

    public List<NotificationDTO> getNotifications() {
        return repository.findByUserIdOrderByCreatedAtDescIdDesc(currentUser().getId(), PageRequest.of(0, FEED_SIZE))
                .stream().map(this::mapToDTO).toList();
    }

    @Transactional
    public Notification markRead(int id) {
        Notification notification = repository.findByIdAndUserId(id, currentUser().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        notification.setRead(true);
        return repository.save(notification);
    }

    @Transactional
    public int markAllRead() {
        return repository.markAllRead(currentUser().getId());
    }

    @Transactional
    public int clear() {
        return repository.deleteByUserId(currentUser().getId());
    }

    // Tells the users who may see a document what the signed-in user did to it, leaving that user
    // out. Sent once the current transaction commits, so a save that fails notifies nobody.
    public void notifyActivity(NotificationType type, String severity, String title, String message) {
        User actor = currentUser();
        String actorName = actor.getFullName() == null || actor.getFullName().isBlank()
                ? actor.getUsername()
                : actor.getFullName();
        int actorId = actor.getId();
        afterCommit(() -> deliver(type, severity, title, message, actorName, null, actorId));
    }

    // Stock alerts go to everyone who may see stock, the user whose save caused them included. Each
    // recipient's unread alert with the same refKey is updated instead of adding another.
    public void notifyStock(NotificationType type, String title, String message, String refKey) {
        String severity = type == NotificationType.OUT_OF_STOCK ? ERROR : WARN;
        deliver(type, severity, title, message, null, refKey, null);
    }

    private void deliver(NotificationType type, String severity, String title, String message, String actor,
            String refKey, Integer skipUserId) {
        try {
            String now = Instant.now().truncatedTo(ChronoUnit.SECONDS).toString();
            List<Notification> saved = newTransaction().execute(status -> {
                List<Notification> rows = new ArrayList<>();
                for (User user : userRepository.findActiveByOperation(type.operation())) {
                    if (skipUserId != null && user.getId() == skipUserId) {
                        continue;
                    }
                    Notification notification = refKey == null ? null
                            : repository.findFirstByUserIdAndRefKeyAndIsReadFalse(user.getId(), refKey).orElse(null);
                    if (notification == null) {
                        notification = new Notification();
                        notification.setUserId(user.getId());
                        notification.setRefKey(refKey);
                    }
                    notification.setType(type.code());
                    notification.setSeverity(severity);
                    notification.setTitle(title);
                    notification.setMessage(message);
                    notification.setActor(actor);
                    notification.setCreatedAt(now);
                    rows.add(repository.save(notification));
                }
                return rows;
            });
            for (Notification notification : saved) {
                socketHandler.send(notification.getUserId(),
                        Map.of("event", "notification", "notification", mapToDTO(notification)));
            }
        } catch (RuntimeException ex) {
            log.warn("Could not send the {} notification \"{}\"", type.code(), title, ex);
        }
    }

    // Runs the action after the current transaction commits, or now when there is none
    static void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }

    // After a commit the finished transaction's resources are still bound, so writing needs a new one
    private TransactionTemplate newTransaction() {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return template;
    }

    private User currentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private NotificationDTO mapToDTO(Notification notification) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(notification.getId());
        dto.setType(notification.getType());
        dto.setSeverity(notification.getSeverity());
        dto.setTitle(notification.getTitle());
        dto.setMessage(notification.getMessage());
        dto.setActor(notification.getActor());
        dto.setRead(notification.isRead());
        dto.setCreatedAt(notification.getCreatedAt());
        return dto;
    }

    // "PE-000012 from Himalayan Distributors, Rs. 45,000.00."
    public static String documentMessage(String systemEntryNo, String party, double total) {
        return docNo(systemEntryNo) + " " + party + ", " + amount(total) + ".";
    }

    // A document number as the app shows it: |PE-000001 → PE-000001, 2082-83|PE-000005 → 2082-83 | PE-000005
    public static String docNo(String systemEntryNo) {
        if (systemEntryNo == null) {
            return "";
        }
        return Arrays.stream(systemEntryNo.split("\\|"))
                .map(String::trim)
                .filter(part -> !part.isEmpty())
                .collect(Collectors.joining(" | "));
    }

    // Rs. 1,23,456.50, grouped like the app's amount pipe (en-IN), which Java's number formats can't do
    public static String amount(double value) {
        String fixed = BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).toPlainString();
        int dot = fixed.indexOf('.');
        return "Rs. " + fixed.substring(0, dot).replaceAll("(\\d)(?=(\\d\\d)*\\d{3}$)", "$1,") + fixed.substring(dot);
    }

    // 8.0 → 8, 2.50 → 2.5
    public static String quantity(double value) {
        return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
    }
}
