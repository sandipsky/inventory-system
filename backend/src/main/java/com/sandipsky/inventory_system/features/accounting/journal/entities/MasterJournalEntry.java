package com.sandipsky.inventory_system.features.accounting.journal.entities;
import com.sandipsky.inventory_system.features.accounting.payment.entities.MasterPayment;
import com.sandipsky.inventory_system.features.sales.sales_entry.entities.MasterSalesEntry;
import com.sandipsky.inventory_system.features.sales.sales_return.entities.MasterSalesReturn;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.MasterPurchaseEntry;
import com.sandipsky.inventory_system.features.purchase.purchase_return.entities.MasterPurchaseReturn;

import java.util.List;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "master_journal_entry")
public class MasterJournalEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String date;

    @Column(columnDefinition = "varchar(25) unique not null")
    private String systemEntryNo;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JoinColumn(name = "masterJournalEntryId", referencedColumnName = "id")
    private List<JournalEntry> journalEntries;

    // ManyToOne instead of OneToOne so the FK columns carry no UNIQUE constraint —
    // SQLite cannot ALTER TABLE ADD a unique column, which breaks ddl-auto=update
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "master_purchase_entry_id", referencedColumnName = "id")
    private MasterPurchaseEntry masterPurchaseEntry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "master_sales_entry_id", referencedColumnName = "id")
    private MasterSalesEntry masterSalesEntry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "master_purchase_return_id", referencedColumnName = "id")
    private MasterPurchaseReturn masterPurchaseReturn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "master_sales_return_id", referencedColumnName = "id")
    private MasterSalesReturn masterSalesReturn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "master_payment_id", referencedColumnName = "id")
    private MasterPayment masterPayment;
}
