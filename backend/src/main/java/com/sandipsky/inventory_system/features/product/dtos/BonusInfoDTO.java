package com.sandipsky.inventory_system.features.product.dtos;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class BonusInfoDTO {
    private int id;
    private Double minQuantity;
    private Double bonusQuantity;
}
