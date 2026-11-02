package com.sandipsky.inventory_system.features.dashboard.dtos;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StockAlertsDTO {
    // In stock, but at or below the product's minimum; lowest first
    @JsonProperty("minimum_stock")
    private List<StockLevelDTO> minimumStock;
    // Nothing left in any batch, never-stocked products included; by name
    @JsonProperty("zero_quantity")
    private List<StockLevelDTO> zeroQuantity;
}
