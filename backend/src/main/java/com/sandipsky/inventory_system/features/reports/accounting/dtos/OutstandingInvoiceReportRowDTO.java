package com.sandipsky.inventory_system.features.reports.accounting.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// One unpaid invoice. The same row shape serves receivables (party is a Customer, invoice is a
// sale) and payables (party is a Vendor, invoice is a purchase).
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OutstandingInvoiceReportRowDTO {
    @JsonProperty("party_type")
    private String partyType;

    @JsonProperty("party_id")
    private Integer partyId;

    @JsonProperty("party_name")
    private String partyName;

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
