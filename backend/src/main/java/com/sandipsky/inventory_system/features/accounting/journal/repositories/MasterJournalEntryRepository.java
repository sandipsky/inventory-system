package com.sandipsky.inventory_system.features.accounting.journal.repositories;
import com.sandipsky.inventory_system.features.accounting.journal.entities.MasterJournalEntry;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


public interface MasterJournalEntryRepository
        extends JpaRepository<MasterJournalEntry, Integer>, JpaSpecificationExecutor<MasterJournalEntry> {
    Optional<MasterJournalEntry> findTopByOrderByIdDesc();

    @Query("SELECT m FROM MasterJournalEntry m " +
            "WHERE m.masterPurchaseEntry.id IS NULL AND m.masterSalesEntry.id IS NULL " +
            "AND m.masterPurchaseReturn.id IS NULL AND m.masterSalesReturn.id IS NULL " +
            "AND m.masterPayment.id IS NULL " +
            "AND m.systemEntryNo <> 'OPENING-BALANCE' " +
            "ORDER BY m.id DESC")
    Optional<MasterJournalEntry> findTopByOrderByIdDescJournal();

    Optional<MasterJournalEntry> findBySystemEntryNo(String systemEntryNo);

    @Query("""
                SELECT j
                FROM MasterJournalEntry j
                WHERE j.masterPayment.id = :masterPaymentId
            """)
    Optional<MasterJournalEntry> findByMasterPaymentId(@Param("masterPaymentId") Integer masterPaymentId);

    @Query("""
                SELECT j
                FROM MasterJournalEntry j
                WHERE j.masterPurchaseEntry.id = :masterPurchaseEntryId
            """)
    Optional<MasterJournalEntry> findByMasterPurchaseEntryId(
            @Param("masterPurchaseEntryId") Integer masterPurchaseEntryId);

    @Query("""
                SELECT j
                FROM MasterJournalEntry j
                WHERE j.masterSalesEntry.id = :masterSalesEntryId
            """)
    Optional<MasterJournalEntry> findByMasterSalesEntryId(
            @Param("masterSalesEntryId") Integer masterSalesEntryId);

    @Query("""
                SELECT j
                FROM MasterJournalEntry j
                WHERE j.masterPurchaseReturn.id = :masterPurchaseReturnId
            """)
    Optional<MasterJournalEntry> findByMasterPurchaseReturnId(
            @Param("masterPurchaseReturnId") Integer masterPurchaseReturnId);

    @Query("""
                SELECT j
                FROM MasterJournalEntry j
                WHERE j.masterSalesReturn.id = :masterSalesReturnId
            """)
    Optional<MasterJournalEntry> findByMasterSalesReturnId(
            @Param("masterSalesReturnId") Integer masterSalesReturnId);
}
