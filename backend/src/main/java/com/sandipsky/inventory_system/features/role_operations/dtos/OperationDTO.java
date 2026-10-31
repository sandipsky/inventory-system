package com.sandipsky.inventory_system.features.role_operations.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OperationDTO {
    private int id;
    private String name;
    private String module;

    @JsonProperty("master_module")
    private String masterModule;
}
