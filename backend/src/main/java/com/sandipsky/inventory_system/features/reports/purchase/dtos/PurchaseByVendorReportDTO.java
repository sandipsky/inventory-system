package com.sandipsky.inventory_system.features.reports.purchase.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseByVendorReportDTO {
    @JsonProperty("vendor_id")
    private Integer vendorId;

    @JsonProperty("vendor_name")
    private String vendorName;

    @JsonProperty("entry_count")
    private Long entryCount;

    @JsonProperty("sub_total")
    private Double subTotal;

    @JsonProperty("total_tax")
    private Double totalTax;

    @JsonProperty("grand_total")
    private Double grandTotal;
}
