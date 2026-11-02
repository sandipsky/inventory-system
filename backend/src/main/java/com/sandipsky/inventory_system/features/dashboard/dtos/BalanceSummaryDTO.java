package com.sandipsky.inventory_system.features.dashboard.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BalanceSummaryDTO {
    // Balance of the Cash & Cash Equivalents accounts: money in hand and in the bank
    @JsonProperty("cash_balance")
    private double cashBalance;
    // Credit balance of the Payables accounts: what is owed to vendors
    private double payables;
    // Debit balance of the Receivables accounts: what customers owe
    private double receivables;
    // The same two balances 7 days ago, for the weekly change
    @JsonProperty("payables_week_ago")
    private double payablesWeekAgo;
    @JsonProperty("receivables_week_ago")
    private double receivablesWeekAgo;
}
