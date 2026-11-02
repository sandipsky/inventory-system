package com.sandipsky.inventory_system.features.notification.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import com.sandipsky.inventory_system.common.util.ResponseUtil;
import com.sandipsky.inventory_system.features.notification.dtos.NotificationDTO;
import com.sandipsky.inventory_system.features.notification.entities.Notification;
import com.sandipsky.inventory_system.features.notification.services.NotificationService;

// The signed-in user's own notifications; any login may use these. New ones also arrive over
// the /ws/notifications socket.
@RestController
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired
    private NotificationService service;

    @GetMapping()
    public List<NotificationDTO> getNotifications() {
        return service.getNotifications();
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Notification>> markRead(@PathVariable int id) {
        Notification res = service.markRead(id);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Notification marked as read"));
    }

    @PutMapping("/read")
    public ResponseEntity<ApiResponse<Notification>> markAllRead() {
        int count = service.markAllRead();
        return ResponseEntity.ok(ResponseUtil.success(count, "Notifications marked as read"));
    }

    @DeleteMapping()
    public ResponseEntity<ApiResponse<Notification>> clear() {
        int count = service.clear();
        return ResponseEntity.ok(ResponseUtil.success(count, "Notifications cleared"));
    }
}
