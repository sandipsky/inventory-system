package com.sandipsky.inventory_system.features.reports.accounting.dtos;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LedgerReportDTO {
    @JsonProperty("account_id")
    private int accountId;

    @JsonProperty("account_name")
    private String accountName;

    @JsonProperty("opening_balance")
    private Double openingBalance;

    @JsonProperty("total_debit")
    private Double totalDebit;

    @JsonProperty("total_credit")
    private Double totalCredit;

    @JsonProperty("closing_balance")
    private Double closingBalance;

    private List<LedgerReportRowDTO> rows;
}
