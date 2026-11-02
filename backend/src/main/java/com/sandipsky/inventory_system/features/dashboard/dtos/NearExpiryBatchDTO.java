package com.sandipsky.inventory_system.features.dashboard.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NearExpiryBatchDTO {
    @JsonProperty("product_id")
    private int productId;
    @JsonProperty("product_name")
    private String productName;
    // 0 is the product's default batch
    @JsonProperty("batch_id")
    private int batchId;
    @JsonProperty("batch_no")
    private String batchNo;
    @JsonProperty("expiry_date")
    private String expiryDate;
    private Double quantity;
}
