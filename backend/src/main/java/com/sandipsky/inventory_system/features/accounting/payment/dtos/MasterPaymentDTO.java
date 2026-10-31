package com.sandipsky.inventory_system.features.accounting.payment.dtos;

import lombok.Data;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class MasterPaymentDTO {
    private int id;

    private String date;

    @JsonProperty("system_entry_no")
    private String systemEntryNo;

    // "Vendor" = money paid to a vendor, "Customer" = money received from a customer
    private String type;

    private double amount;

    private String narration;

    @JsonProperty("total_adjusted_paid_amount")
    private double totalAdjustedPaidAmount;

    @JsonProperty("unadjusted_amount")
    private double unadjustedAmount;

    @JsonProperty("total_payment_amount")
    private double totalPaymentAmount;

    @JsonProperty("payment_mode_id")
    private int paymentModeId;

    @JsonProperty("payment_mode_name")
    private String paymentModeName;

    @JsonProperty("vendor_id")
    private int vendorId;

    @JsonProperty("vendor_name")
    private String vendorName;

    @JsonProperty("customer_id")
    private int customerId;

    @JsonProperty("customer_name")
    private String customerName;

    private List<PaymentDetailDTO> paymentDetails;
}
