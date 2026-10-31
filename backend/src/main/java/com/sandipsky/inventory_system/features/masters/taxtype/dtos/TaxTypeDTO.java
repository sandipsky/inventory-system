package com.sandipsky.inventory_system.features.masters.taxtype.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class TaxTypeDTO {
    private int id;
    private String name;

    @JsonProperty("tax_rate")
    private double taxRate;

    @JsonProperty("is_active")
    private boolean isActive;
}
