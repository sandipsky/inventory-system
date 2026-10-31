package com.sandipsky.inventory_system.features.role_operations.dtos;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RoleDTO {
    private int id;
    private String name;
    private String description;

    @JsonProperty("is_active")
    private boolean isActive = true;

    @JsonProperty("operation_ids")
    private List<Integer> operationIds = new ArrayList<>();

    private List<OperationDTO> operations = new ArrayList<>();
}
