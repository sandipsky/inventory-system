package com.sandipsky.inventory_system.features.reports.accounting.repositories;
import com.sandipsky.inventory_system.features.accounting.journal.entities.JournalEntry;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountingReportRepository extends JpaRepository<JournalEntry, Integer> {

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.accounting.dtos.JournalReportRowDTO(
                    mje.date, mje.systemEntryNo, a.accountName, je.narration, je.debitAmount, je.creditAmount)
                FROM JournalEntry je JOIN je.masterAccount a, MasterJournalEntry mje
                WHERE je.masterJournalEntryId = mje.id
                  AND (:fromDate IS NULL OR mje.date >= :fromDate)
                  AND (:toDate IS NULL OR mje.date <= :toDate)
                ORDER BY mje.date, mje.id, je.id
            """)
    List<com.sandipsky.inventory_system.features.reports.accounting.dtos.JournalReportRowDTO> findJournalReport(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.accounting.dtos.LedgerReportRowDTO(
                    mje.date, mje.systemEntryNo, je.narration, je.debitAmount, je.creditAmount, 0.0)
                FROM JournalEntry je, MasterJournalEntry mje
                WHERE je.masterJournalEntryId = mje.id
                  AND je.masterAccount.id = :accountId
                  AND (:fromDate IS NULL OR mje.date >= :fromDate)
                  AND (:toDate IS NULL OR mje.date <= :toDate)
                ORDER BY mje.date, mje.id, je.id
            """)
    List<com.sandipsky.inventory_system.features.reports.accounting.dtos.LedgerReportRowDTO> findLedgerRows(
            @Param("accountId") int accountId, @Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT COALESCE(SUM(je.debitAmount), 0) - COALESCE(SUM(je.creditAmount), 0)
                FROM JournalEntry je, MasterJournalEntry mje
                WHERE je.masterJournalEntryId = mje.id
                  AND je.masterAccount.id = :accountId
                  AND mje.date < :fromDate
            """)
    Double findOpeningBalance(@Param("accountId") int accountId, @Param("fromDate") String fromDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.accounting.dtos.TrialBalanceRowDTO(
                    a.id, a.accountCode, a.accountName, a.accountType,
                    COALESCE(SUM(je.debitAmount), 0), COALESCE(SUM(je.creditAmount), 0))
                FROM JournalEntry je JOIN je.masterAccount a, MasterJournalEntry mje
                WHERE je.masterJournalEntryId = mje.id
                  AND (:fromDate IS NULL OR mje.date >= :fromDate)
                  AND (:toDate IS NULL OR mje.date <= :toDate)
                GROUP BY a.id, a.accountCode, a.accountName, a.accountType
                ORDER BY a.accountName
            """)
    List<com.sandipsky.inventory_system.features.reports.accounting.dtos.TrialBalanceRowDTO> findTrialBalance(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);

    // Accounts receivable: credit sales the customer has not fully paid
    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.accounting.dtos.OutstandingInvoiceReportRowDTO(
                    'Customer', c.id, c.name, m.systemEntryNo, m.date,
                    adi.totalInvoiceAmount, adi.paidAmount, adi.dueAmount)
                FROM AmountDueInvoice adi, MasterSalesEntry m JOIN m.customer c
                WHERE adi.invoiceNumber = m.systemEntryNo
                  AND adi.dueAmount > 0
                ORDER BY c.name, m.date
            """)
    List<com.sandipsky.inventory_system.features.reports.accounting.dtos.OutstandingInvoiceReportRowDTO> findReceivables();

    // Accounts payable: credit purchases we have not fully paid the vendor for
    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.accounting.dtos.OutstandingInvoiceReportRowDTO(
                    'Vendor', v.id, v.name, m.systemEntryNo, m.date,
                    adi.totalInvoiceAmount, adi.paidAmount, adi.dueAmount)
                FROM AmountDueInvoice adi, MasterPurchaseEntry m JOIN m.vendor v
                WHERE adi.invoiceNumber = m.systemEntryNo
                  AND adi.dueAmount > 0
                ORDER BY v.name, m.date
            """)
    List<com.sandipsky.inventory_system.features.reports.accounting.dtos.OutstandingInvoiceReportRowDTO> findPayables();
}
