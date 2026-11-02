package com.sandipsky.inventory_system.features.dashboard.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Debit minus credit of all accounts of one type
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AccountTypeBalanceDTO {
    private String accountType;
    private Double netDebit;
}
