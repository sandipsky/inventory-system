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
public class LedgerReportRowDTO {
    private String date;

    @JsonProperty("system_entry_no")
    private String systemEntryNo;

    private String narration;

    @JsonProperty("debit_amount")
    private Double debitAmount;

    @JsonProperty("credit_amount")
    private Double creditAmount;

    // Running balance after this line: positive = debit balance, negative = credit balance
    private Double balance;
}
