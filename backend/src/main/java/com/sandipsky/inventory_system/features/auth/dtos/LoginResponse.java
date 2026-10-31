package com.sandipsky.inventory_system.features.auth.dtos;

import lombok.Data;

@Data
public class LoginResponse {
    String token;

    public LoginResponse(String token) {
        this.token = token;
    }
}
