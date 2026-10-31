package com.sandipsky.inventory_system.features.product.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import lombok.Getter;
import lombok.Setter;

// One batch of a product's stock; batch_id 0 with a null batch_no is the default batch
@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ProductStockDTO {
    @JsonProperty("batch_id")
    private int id;

    @JsonProperty("batch_no")
    private String batchNo;

    @JsonProperty("expiry_date")
    private String expiryDate;

    @JsonProperty("available_quantity")
    private Double quantity;

    @JsonProperty("cost_price")
    private Double costPrice;

    @JsonProperty("selling_price")
    private Double sellingPrice;

    private Double mrp;
}
