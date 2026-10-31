package com.sandipsky.inventory_system.features.settings.configuration.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ConfigurationDTO {
    private int id;
    private String name;
    private String label;
    private String value;

    @JsonProperty("is_editable")
    private boolean isEditable;
}
