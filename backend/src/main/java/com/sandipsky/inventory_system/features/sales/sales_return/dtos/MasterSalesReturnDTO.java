package com.sandipsky.inventory_system.features.sales.sales_return.dtos;

import lombok.Data;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class MasterSalesReturnDTO {
    private int id;

    private String date;

    @JsonProperty("system_entry_no")
    private String systemEntryNo;

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

    private boolean rounded;

    private double rounding;

    @JsonProperty("grand_total")
    private double grandTotal;

    @JsonProperty("discount_type")
    private String discountType;

    private String remarks;

    @JsonProperty("customer_id")
    private int customerId;

    @JsonProperty("customer_name")
    private String customerName;

    private List<SalesReturnEntryDTO> salesReturnEntries;
}
