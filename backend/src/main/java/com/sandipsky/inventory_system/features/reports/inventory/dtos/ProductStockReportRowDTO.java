package com.sandipsky.inventory_system.features.reports.inventory.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductStockReportRowDTO {
    private int id;

    @JsonProperty("product_id")
    private int productId;

    @JsonProperty("product_name")
    private String productName;

    private Double quantity;

    @JsonProperty("cost_price")
    private Double costPrice;

    @JsonProperty("selling_price")
    private Double sellingPrice;

    private Double mrp;

    @JsonProperty("stock_value")
    private Double stockValue;
}
