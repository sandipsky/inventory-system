package com.sandipsky.inventory_system.features.purchase.purchase_return.dtos;

import lombok.Data;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class MasterPurchaseReturnDTO {
    private int id;

    private String date;

    @JsonProperty("system_entry_no")
    private String systemEntryNo;

    @JsonProperty("bill_no")
    private String billNo;

    @JsonProperty("transaction_type")
    private String transactionType;

    @JsonProperty("sub_total")
    private double subTotal;

    private double discount;

    @JsonProperty("non_taxable_amount")
    private double nonTaxableAmount;

    @JsonProperty("taxable_amount")
    private double taxableAmount;

    @JsonProperty("tax")
    private double totalTax;

    private boolean rounded;

    private double rounding;

    @JsonProperty("grand_total")
    private double grandTotal;

    @JsonProperty("discount_type")
    private String discountType;

    private String remarks;

    @JsonProperty("vendor_id")
    private int vendorId;

    @JsonProperty("vendor_name")
    private String vendorName;

    private List<PurchaseReturnEntryDTO> purchaseReturnEntries;
}
