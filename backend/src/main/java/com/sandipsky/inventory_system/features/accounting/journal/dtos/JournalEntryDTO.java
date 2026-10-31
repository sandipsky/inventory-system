package com.sandipsky.inventory_system.features.accounting.journal.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class JournalEntryDTO {
    private int id;

    @JsonProperty("master_journal_entry_id")
    private int masterJournalEntryId;

    @JsonProperty("narration")
    private String narration;

    @JsonProperty("debit_amount")
    private Double debitAmount;

    @JsonProperty("credit_amount")
    private Double creditAmount;

    @JsonProperty("account_master_id")
    private int accountMasterId;

    @JsonProperty("account_master_name")
    private String accountMasterName;
}
