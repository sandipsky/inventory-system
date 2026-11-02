package com.sandipsky.inventory_system.features.notification.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.sandipsky.inventory_system.features.notification.entities.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {

    List<Notification> findByUserIdOrderByCreatedAtDescIdDesc(int userId, Pageable pageable);

    Optional<Notification> findByIdAndUserId(int id, int userId);

    Optional<Notification> findFirstByUserIdAndRefKeyAndIsReadFalse(int userId, String refKey);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.userId = :userId AND n.isRead = false")
    int markAllRead(@Param("userId") int userId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.userId = :userId")
    int deleteByUserId(@Param("userId") int userId);
}
