package com.sandipsky.inventory_system.features.purchase.purchase_return.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PurchaseReturnEntryDTO {
    private int id;

    @JsonProperty("master_purchase_return_id")
    private int masterPurchaseReturnId;

    private Double quantity;

    @JsonProperty("cost_price")
    private Double costPrice;

    @JsonProperty("selling_price")
    private Double sellingPrice;

    private Double mrp;

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
