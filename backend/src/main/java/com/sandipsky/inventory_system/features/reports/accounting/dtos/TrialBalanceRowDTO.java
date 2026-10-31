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
public class TrialBalanceRowDTO {
    @JsonProperty("account_id")
    private Integer accountId;

    @JsonProperty("account_code")
    private String accountCode;

    @JsonProperty("account_name")
    private String accountName;

    @JsonProperty("account_type")
    private String accountType;

    @JsonProperty("total_debit")
    private Double totalDebit;

    @JsonProperty("total_credit")
    private Double totalCredit;

    @JsonProperty("debit_balance")
    private Double debitBalance;

    @JsonProperty("credit_balance")
    private Double creditBalance;

    public TrialBalanceRowDTO(Integer accountId, String accountCode, String accountName, String accountType,
            Double totalDebit, Double totalCredit) {
        this.accountId = accountId;
        this.accountCode = accountCode;
        this.accountName = accountName;
        this.accountType = accountType;
        this.totalDebit = totalDebit;
        this.totalCredit = totalCredit;
    }
}
