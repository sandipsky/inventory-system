package com.sandipsky.inventory_system.features.reports.purchase.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PurchaseReportRowDTO {
    private int id;

    private String date;

    @JsonProperty("system_entry_no")
    private String systemEntryNo;

    @JsonProperty("bill_no")
    private String billNo;

    @JsonProperty("vendor_name")
    private String vendorName;

    @JsonProperty("transaction_type")
    private String transactionType;

    @JsonProperty("sub_total")
    private double subTotal;

    private double discount;

    @JsonProperty("non_taxable_amount")
    private double nonTaxableAmount;

    @JsonProperty("taxable_amount")
    private double taxableAmount;

    @JsonProperty("total_tax")
    private double totalTax;

    @JsonProperty("grand_total")
    private double grandTotal;
}
