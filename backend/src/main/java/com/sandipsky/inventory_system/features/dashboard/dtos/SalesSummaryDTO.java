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
public class SalesSummaryDTO {
    @JsonProperty("total_sales")
    private Double totalSales;
    @JsonProperty("total_sales_return")
    private Double totalSalesReturn;
    // Sales minus sales returns; needs both
    @JsonProperty("net_sales")
    private Double netSales;
}
