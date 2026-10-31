package com.sandipsky.inventory_system.features.purchase.purchase_entry.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PurchaseEntryDTO {
    private int id;

    @JsonProperty("master_purchase_entry_id")
    private int masterPurchaseEntryId;

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

    // Typed in: an unknown batch number creates a new batch, blank means the default batch
    @JsonProperty("batch_no")
    private String batchNo;

    @JsonProperty("expiry_date")
    private String expiryDate;

    @JsonProperty("batch_id")
    private int batchId;
}
