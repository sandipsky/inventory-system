package com.sandipsky.inventory_system.features.inventory.stock_adjustment.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StockAdjustmentEntryDTO {
    private int id;

    @JsonProperty("master_stock_adjustment_id")
    private int masterStockAdjustmentId;

    @JsonProperty("adjustment_type")
    private String adjustmentType;

    private Double quantity;

    private String reason;

    @JsonProperty("product_id")
    private int productId;

    @JsonProperty("product_name")
    private String productName;

    // Picked from the product's stock info; 0 means the default batch
    @JsonProperty("batch_id")
    private int batchId;

    @JsonProperty("batch_no")
    private String batchNo;
}
