package com.sandipsky.inventory_system.features.notification.socket;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

// ws://host/ws/notifications?token=<jwt>. Server to client only: each message is JSON such as
// {"event": "notification", "notification": {...}}. A user may have several sockets open (tabs).
@Component
public class NotificationSocketHandler extends TextWebSocketHandler {

    // Session attributes set by SocketAuthInterceptor
    static final String USER_ID = "userId";
    static final String EXPIRES_AT = "expiresAt";

    // Sent when the token the socket opened with has expired; the client logs in again
    static final CloseStatus TOKEN_EXPIRED = new CloseStatus(4401, "Token expired");

    private static final int SEND_TIME_LIMIT_MS = 10_000;
    private static final int BUFFER_SIZE_LIMIT = 512 * 1024;

    private static final Logger log = LoggerFactory.getLogger(NotificationSocketHandler.class);

    @Autowired
    private ObjectMapper objectMapper;

    private final Map<Integer, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        // Saves from several requests can push to one socket at once; the decorator queues them
        WebSocketSession concurrent = new ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS,
                BUFFER_SIZE_LIMIT);
        sessionsByUser.computeIfAbsent(userId(session), id -> ConcurrentHashMap.newKeySet()).add(concurrent);
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        remove(session);
    }

    @Override
    public void handleTransportError(@NonNull WebSocketSession session, @NonNull Throwable exception) {
        remove(session);
    }

    // Pushes the message to every socket the user has open
    public void send(int userId, Object message) {
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }
        TextMessage text;
        try {
            text = new TextMessage(objectMapper.writeValueAsString(message));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException(ex);
        }
        for (WebSocketSession session : sessions) {
            try {
                if (expired(session)) {
                    session.close(TOKEN_EXPIRED);
                    remove(session);
                } else if (session.isOpen()) {
                    session.sendMessage(text);
                }
            } catch (IOException | IllegalStateException ex) {
                log.debug("Dropping notification socket {}", session.getId(), ex);
                remove(session);
            }
        }
    }

    private void remove(WebSocketSession session) {
        Set<WebSocketSession> sessions = sessionsByUser.get(userId(session));
        if (sessions != null) {
            sessions.removeIf(open -> open.getId().equals(session.getId()));
        }
    }

    private static int userId(WebSocketSession session) {
        return (Integer) session.getAttributes().get(USER_ID);
    }

    private static boolean expired(WebSocketSession session) {
        Instant expiresAt = (Instant) session.getAttributes().get(EXPIRES_AT);
        return expiresAt != null && expiresAt.isBefore(Instant.now());
    }
}
