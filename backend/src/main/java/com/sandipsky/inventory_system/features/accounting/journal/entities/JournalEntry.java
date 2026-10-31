package com.sandipsky.inventory_system.features.accounting.journal.entities;
import com.sandipsky.inventory_system.features.accounting.account.entities.AccountMaster;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "journal_entry")
public class JournalEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private int masterJournalEntryId;

    private String narration;

    private Double debitAmount;

    private Double creditAmount;

    @ManyToOne
    @JoinColumn(name = "account_master_id")
    private AccountMaster masterAccount;
}