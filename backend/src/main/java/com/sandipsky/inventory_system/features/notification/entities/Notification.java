package com.sandipsky.inventory_system.features.notification.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

// One notification for one user; every recipient gets their own row so read and clear are per user
@Entity
@Getter
@Setter
@Table(name = "notification")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(name = "user_id", nullable = false)
    private int userId;

    // A NotificationType code, e.g. sales_entry or low_stock
    @Column(nullable = false)
    private String type;

    // info, warn or error
    @Column(nullable = false)
    private String severity;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    // Who did what the notification reports; null for stock alerts
    private String actor;

    // What a stock alert is about (product:12): a newer alert updates the recipient's unread one
    @Column(name = "ref_key")
    private String refKey;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    // ISO-8601 UTC instant to the second, so it sorts as text
    @Column(name = "created_at", nullable = false)
    private String createdAt;
}
