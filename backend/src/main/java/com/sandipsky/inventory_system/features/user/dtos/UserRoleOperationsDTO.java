package com.sandipsky.inventory_system.features.user.dtos;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserRoleOperationsDTO {

    private int id;

    private String username;

    @JsonProperty("name")
    private String fullName;

    @JsonProperty("role_id")
    private Integer roleId;

    @JsonProperty("role_name")
    private String roleName;

    @JsonProperty("image_url")
    private String imageUrl;

    @JsonProperty("master_modules")
    private List<String> masterModules = new ArrayList<>();

    private List<String> modules = new ArrayList<>();

    private List<String> operations = new ArrayList<>();
}
