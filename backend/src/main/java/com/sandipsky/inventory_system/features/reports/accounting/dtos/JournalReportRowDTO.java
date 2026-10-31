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
public class JournalReportRowDTO {
    private String date;

    @JsonProperty("system_entry_no")
    private String systemEntryNo;

    @JsonProperty("account_name")
    private String accountName;

    private String narration;

    @JsonProperty("debit_amount")
    private Double debitAmount;

    @JsonProperty("credit_amount")
    private Double creditAmount;
}
