package com.sandipsky.inventory_system.features.role_operations.dtos;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RoleOperationGroupDTO {

    @JsonProperty("master_module")
    private String masterModule;

    private List<ModuleGroup> modules = new ArrayList<>();

    @Getter
    @Setter
    public static class ModuleGroup {
        @JsonProperty("module_name")
        private String moduleName;

        private List<OperationSelection> operations = new ArrayList<>();
    }

    @Getter
    @Setter
    public static class OperationSelection {
        private int id;
        private String name;
        private boolean selected;
    }
}
