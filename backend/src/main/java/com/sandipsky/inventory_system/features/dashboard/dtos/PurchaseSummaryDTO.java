package com.sandipsky.inventory_system.features.dashboard.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Each figure is null when the user may not view its documents
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseSummaryDTO {
    @JsonProperty("total_purchase")
    private Double totalPurchase;
    @JsonProperty("total_purchase_return")
    private Double totalPurchaseReturn;
}
