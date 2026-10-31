package com.sandipsky.inventory_system.features.reports.accounting.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DueAmountReportRowDTO {
    @JsonProperty("customer_id")
    private Integer customerId;

    @JsonProperty("customer_name")
    private String customerName;

    @JsonProperty("invoice_number")
    private String invoiceNumber;

    @JsonProperty("invoice_date")
    private String invoiceDate;

    @JsonProperty("total_invoice_amount")
    private Double totalInvoiceAmount;

    @JsonProperty("paid_amount")
    private Double paidAmount;

    @JsonProperty("due_amount")
    private Double dueAmount;
}
