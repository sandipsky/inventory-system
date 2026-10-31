package com.sandipsky.inventory_system.features.accounting.payment.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaymentDetailDTO {
    private int id;

    @JsonProperty("master_payment_id")
    private int masterPaymentId;

    @JsonProperty("invoice_date")
    private String invoiceDate;

    @JsonProperty("invoice_number")
    private String invoiceNumber;

    @JsonProperty("total_invoice_amount")
    private double totalInvoiceAmount;

    @JsonProperty("due_amount")
    private double dueAmount;

    @JsonProperty("paid_amount")
    private double paidAmount;
}
