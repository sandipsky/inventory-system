package com.sandipsky.inventory_system.features.auth.services;
import com.sandipsky.inventory_system.features.auth.dtos.ChangePasswordRequest;
import com.sandipsky.inventory_system.features.auth.dtos.LoginRequest;

import com.sandipsky.inventory_system.common.exception.AccessDeniedException;
import com.sandipsky.inventory_system.common.exception.AccountLockException;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.role_operations.entities.Operation;
import com.sandipsky.inventory_system.features.role_operations.entities.Role;
import com.sandipsky.inventory_system.features.user.entities.User;
import com.sandipsky.inventory_system.features.user.repositories.UserRepository;
import com.sandipsky.inventory_system.features.user.dtos.UserRoleOperationsDTO;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
        @Autowired
        private UserRepository userRepository;

        @Autowired
        private AuthenticationManager authenticationManager;

        @Value("${auth.maxFailedAttempts}")
        private int maxFailedAttempts;

        @Value("${auth.lockTimeDurationMs}")
        private long lockTimeDurationMs;

        @Autowired
        private PasswordEncoder passwordEncoder;

        private static final Pattern STRONG_PASSWORD = Pattern
                        .compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$");

        public User authenticate(LoginRequest request) {
                User user = userRepository.findByUsername(request.getUsername())
                                .orElseThrow(() -> new BadCredentialsException("Username or Password is Incorrect."));

                if (!user.isActive()) {
                        throw new AccessDeniedException("User account is inactive.");
                }

                ensureUnlocked(user);

                try {
                        authenticationManager.authenticate(
                                        new UsernamePasswordAuthenticationToken(
                                                        request.getUsername(),
                                                        request.getPassword()));
                } catch (Exception ex) {
                        recordFailedAttempt(user);
                        throw new BadCredentialsException("Username or Password is Incorrect.");
                }

                clearFailedAttempts(user);
                userRepository.save(user);
                return user;
        }

        // The signed-in user's own password. A wrong current password counts towards the lock like
        // a failed login, so a stolen session can't be used to guess it; the new one must be strong
        // and differ from the current one.
        public User changePassword(String username, ChangePasswordRequest request) {
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                String current = request.getCurrentPassword();
                String next = request.getNewPassword();
                if (current == null || current.isEmpty() || next == null || next.isEmpty()) {
                        throw new BadRequestException("Current password and new password are required");
                }

                ensureUnlocked(user);
                if (!passwordEncoder.matches(current, user.getPassword())) {
                        recordFailedAttempt(user);
                        throw new BadRequestException("Current password is incorrect");
                }
                if (!isStrong(next)) {
                        throw new BadRequestException("New password must be at least 8 characters with upper and lower"
                                        + " case letters, a number and a symbol");
                }
                if (next.equals(current)) {
                        throw new BadRequestException("New password must be different from the current password");
                }

                user.setPassword(passwordEncoder.encode(next));
                clearFailedAttempts(user);
                return userRepository.save(user);
        }

        // 8+ characters with upper and lower case letters, a number and a symbol: the rules the web
        // app's password checklist shows
        static boolean isStrong(String password) {
                return STRONG_PASSWORD.matcher(password).matches();
        }

        // Unlocks an account whose lock has run out; throws while it is still locked
        private void ensureUnlocked(User user) {
                if (user.isAccountNonLocked()) {
                        return;
                }
                if (user.getLockTime() != null
                                && System.currentTimeMillis() - user.getLockTime().getTime() >= lockTimeDurationMs) {
                        clearFailedAttempts(user);
                        userRepository.save(user);
                        return;
                }
                throw new AccountLockException("Account is locked. Try again later.");
        }

        // Counts a wrong password, locking the account once there are too many
        private void recordFailedAttempt(User user) {
                int attempts = user.getFailedAttempt() + 1;
                user.setFailedAttempt(attempts);
                if (attempts >= maxFailedAttempts) {
                        user.setAccountNonLocked(false);
                        user.setLockTime(new java.util.Date());
                }
                userRepository.save(user);
        }

        private void clearFailedAttempts(User user) {
                user.setFailedAttempt(0);
                user.setAccountNonLocked(true);
                user.setLockTime(null);
        }

        public UserRoleOperationsDTO getUserRoleOperations(String username) {
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

                UserRoleOperationsDTO dto = new UserRoleOperationsDTO();
                dto.setId(user.getId());
                dto.setUsername(user.getUsername());
                dto.setFullName(user.getFullName());
                dto.setImageUrl(user.getImageUrl());

                Role role = user.getRole();
                if (role == null) {
                        return dto;
                }

                dto.setRoleId(role.getId());
                dto.setRoleName(role.getName());

                Set<String> masterModules = new LinkedHashSet<>();
                Set<String> modules = new LinkedHashSet<>();
                Set<String> operations = new LinkedHashSet<>();

                if (role.getOperations() != null) {
                        for (Operation op : role.getOperations()) {
                                masterModules.add(op.getMasterModule());
                                modules.add(op.getModule());
                                operations.add(op.getName());
                        }
                }

                dto.getMasterModules().addAll(masterModules);
                dto.getModules().addAll(modules);
                dto.getOperations().addAll(operations);
                return dto;
        }
}
