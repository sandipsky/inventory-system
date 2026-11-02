package com.sandipsky.inventory_system.common.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import com.sandipsky.inventory_system.features.notification.socket.NotificationSocketHandler;
import com.sandipsky.inventory_system.features.notification.socket.SocketAuthInterceptor;

// The notification socket runs inside this app, on the API's port
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private NotificationSocketHandler notificationSocketHandler;

    @Autowired
    private SocketAuthInterceptor socketAuthInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Any origin, like the API's CORS setup: the token is what authenticates
        registry.addHandler(notificationSocketHandler, "/ws/notifications")
                .addInterceptors(socketAuthInterceptor)
                .setAllowedOriginPatterns("*");
    }
}
