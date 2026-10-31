package com.sandipsky.inventory_system.security;

import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.sandipsky.inventory_system.common.exception.AccessDeniedException;
import com.sandipsky.inventory_system.features.user.repositories.UserRepository;

@Aspect
@Component
public class OperationAuthorizationAspect {

    private static final String NOT_ALLOWED = "Operation not allowed";

    @Autowired
    private UserRepository userRepository;

    @Before("@annotation(requires)")
    public void checkOperation(RequiresOperation requires) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()
                || "anonymousUser".equals(auth.getName())) {
            throw new AccessDeniedException(NOT_ALLOWED);
        }
        for (String operation : requires.value()) {
            if (userRepository.existsByUsernameAndOperation(auth.getName(), operation)) {
                return;
            }
        }
        throw new AccessDeniedException(NOT_ALLOWED);
    }
}
