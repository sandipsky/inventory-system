package com.sandipsky.inventory_system.features.accounting.journal.repositories;
import com.sandipsky.inventory_system.features.accounting.journal.entities.JournalEntry;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;



public interface JournalEntryRepository extends JpaRepository<JournalEntry, Integer>, JpaSpecificationExecutor<JournalEntry> {
    List<JournalEntry> findByMasterJournalEntryId(Integer masterJournalEntryId);
}
