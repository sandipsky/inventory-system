package com.sandipsky.inventory_system.features.auth.controllers;
import com.sandipsky.inventory_system.features.auth.dtos.LoginResponse;
import com.sandipsky.inventory_system.features.auth.dtos.LoginRequest;
import com.sandipsky.inventory_system.features.auth.services.AuthService;

import com.sandipsky.inventory_system.features.user.entities.User;
import com.sandipsky.inventory_system.features.user.dtos.UserRoleOperationsDTO;
import com.sandipsky.inventory_system.common.exception.AccessDeniedException;
import com.sandipsky.inventory_system.security.JwtUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;


@RestController
@RequestMapping("")
public class AuthController {

    @Autowired
    AuthService authService;

    @Autowired
    JwtUtil jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest user) {
        User authenticatedUser = authService.authenticate(user);

        String jwtToken = jwtUtils.generateToken(authenticatedUser);

        return ResponseEntity.ok(new LoginResponse(jwtToken));
    }

    @GetMapping("/getUserRoleOperations")
    public ResponseEntity<UserRoleOperationsDTO> getUserRoleOperations(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new AccessDeniedException("Missing or invalid Authorization header");
        }
        String token = authHeader.substring(7);
        String username = jwtUtils.extractUsername(token);
        if (username == null || username.isBlank()) {
            throw new AccessDeniedException("Invalid token");
        }
        return ResponseEntity.ok(authService.getUserRoleOperations(username));
    }
}
