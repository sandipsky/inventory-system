package com.sandipsky.inventory_system.features.auth.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Proxy;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.sandipsky.inventory_system.common.exception.AccountLockException;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.features.auth.dtos.ChangePasswordRequest;
import com.sandipsky.inventory_system.features.user.entities.User;
import com.sandipsky.inventory_system.features.user.repositories.UserRepository;

class AuthServiceTest {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private final AuthService authService = new AuthService();
    private User user;

    // A repository holding the one user: finds it by its username and saves it in place
    private UserRepository repositoryOf(User stored) {
        return (UserRepository) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[] { UserRepository.class }, (proxy, method, args) -> switch (method.getName()) {
                    case "findByUsername" -> Optional.of(stored).filter(each -> each.getUsername().equals(args[0]));
                    case "save" -> args[0];
                    default -> throw new UnsupportedOperationException(method.getName());
                });
    }

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(7);
        user.setUsername("sita");
        user.setPassword(passwordEncoder.encode("Old@1234"));
        ReflectionTestUtils.setField(authService, "userRepository", repositoryOf(user));
        ReflectionTestUtils.setField(authService, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(authService, "maxFailedAttempts", 5);
        ReflectionTestUtils.setField(authService, "lockTimeDurationMs", 3_600_000L);
    }

    private User change(String current, String next) {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword(current);
        request.setNewPassword(next);
        return authService.changePassword("sita", request);
    }

    @Test
    void savesTheNewPasswordAndClearsFailedAttempts() {
        user.setFailedAttempt(2);

        change("Old@1234", "New@5678");

        assertTrue(passwordEncoder.matches("New@5678", user.getPassword()));
        assertEquals(0, user.getFailedAttempt());
    }

    @Test
    void aWrongCurrentPasswordCountsTowardsTheLock() {
        BadRequestException error = assertThrows(BadRequestException.class, () -> change("nope", "New@5678"));

        assertEquals("Current password is incorrect", error.getMessage());
        assertEquals(1, user.getFailedAttempt());
        assertTrue(passwordEncoder.matches("Old@1234", user.getPassword()));
    }

    @Test
    void theFifthWrongPasswordLocksTheAccount() {
        user.setFailedAttempt(4);

        assertThrows(BadRequestException.class, () -> change("nope", "New@5678"));

        assertFalse(user.isAccountNonLocked());
        assertThrows(AccountLockException.class, () -> change("Old@1234", "New@5678"));
    }

    @Test
    void refusesAWeakOrUnchangedPassword() {
        assertEquals("New password must be at least 8 characters with upper and lower case letters, a number"
                + " and a symbol",
                assertThrows(BadRequestException.class, () -> change("Old@1234", "weakpass")).getMessage());
        assertEquals("New password must be different from the current password",
                assertThrows(BadRequestException.class, () -> change("Old@1234", "Old@1234")).getMessage());
        assertThrows(BadRequestException.class, () -> change("", "New@5678"));
        assertEquals(0, user.getFailedAttempt());
    }

    @Test
    void aStrongPasswordHasEveryKindOfCharacter() {
        assertTrue(AuthService.isStrong("Abcdef1!"));
        assertFalse(AuthService.isStrong("Abcde1!"));
        assertFalse(AuthService.isStrong("abcdef1!"));
        assertFalse(AuthService.isStrong("ABCDEF1!"));
        assertFalse(AuthService.isStrong("Abcdefg!"));
        assertFalse(AuthService.isStrong("Abcdefg1"));
    }
}
