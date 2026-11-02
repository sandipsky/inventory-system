package com.sandipsky.inventory_system.features.notification.socket;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import com.sandipsky.inventory_system.features.user.entities.User;
import com.sandipsky.inventory_system.features.user.repositories.UserRepository;
import com.sandipsky.inventory_system.security.JwtUtil;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// Browsers can't set headers on a WebSocket, so the JWT comes as ?token=. A missing, invalid or
// expired one answers the handshake with 401.
@Component
public class SocketAuthInterceptor implements HandshakeInterceptor {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Override
    public boolean beforeHandshake(@NonNull ServerHttpRequest request, @NonNull ServerHttpResponse response,
            @NonNull WebSocketHandler handler, @NonNull Map<String, Object> attributes) {
        String token = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst("token");
        try {
            if (token != null && !token.isBlank()) {
                User user = userRepository.findByUsername(jwtUtil.extractUsername(token)).orElse(null);
                if (user != null && jwtUtil.isTokenValid(token, user)) {
                    attributes.put(NotificationSocketHandler.USER_ID, user.getId());
                    attributes.put(NotificationSocketHandler.EXPIRES_AT,
                            jwtUtil.extractClaim(token, Claims::getExpiration).toInstant());
                    return true;
                }
            }
        } catch (JwtException | IllegalArgumentException ex) {
            // Falls through to 401
        }
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        return false;
    }

    @Override
    public void afterHandshake(@NonNull ServerHttpRequest request, @NonNull ServerHttpResponse response,
            @NonNull WebSocketHandler handler, Exception exception) {
    }
}
