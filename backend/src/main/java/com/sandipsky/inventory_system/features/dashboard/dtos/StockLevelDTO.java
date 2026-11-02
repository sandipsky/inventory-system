package com.sandipsky.inventory_system.features.dashboard.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// A product's stock with every batch added up
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StockLevelDTO {
    @JsonProperty("product_id")
    private Integer productId;
    @JsonProperty("product_name")
    private String productName;
    @JsonProperty("product_code")
    private String productCode;
    private Double quantity;
    // null when the product sets no minimum
    @JsonProperty("min_stock")
    private Double minStock;
}
