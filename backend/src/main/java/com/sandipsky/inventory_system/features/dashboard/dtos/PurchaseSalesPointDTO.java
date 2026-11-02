package com.sandipsky.inventory_system.features.dashboard.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// One day, week or month of the purchase vs sales chart
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseSalesPointDTO {
    @JsonProperty("from_date")
    private String fromDate;
    @JsonProperty("to_date")
    private String toDate;
    // Grand total of purchases; null without ViewPurchaseEntry
    private Double purchase;
    // Grand total of sales, cancelled ones left out; null without ViewSalesEntries
    private Double sales;
}
