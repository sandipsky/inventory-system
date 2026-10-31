package com.sandipsky.inventory_system.common.exception;

// A request that breaks a business rule (bad input, not enough stock, ...) — reported as 400
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
