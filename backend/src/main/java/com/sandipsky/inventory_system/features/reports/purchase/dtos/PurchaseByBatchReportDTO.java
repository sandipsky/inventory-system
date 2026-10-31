package com.sandipsky.inventory_system.features.reports.purchase.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// One row per product batch; batch_id 0 is the product's default batch
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseByBatchReportDTO {
    @JsonProperty("product_id")
    private Integer productId;

    @JsonProperty("product_name")
    private String productName;

    @JsonProperty("batch_id")
    private Integer batchId;

    @JsonProperty("batch_no")
    private String batchNo;

    @JsonProperty("expiry_date")
    private String expiryDate;

    private Double quantity;

    private Double amount;
}
