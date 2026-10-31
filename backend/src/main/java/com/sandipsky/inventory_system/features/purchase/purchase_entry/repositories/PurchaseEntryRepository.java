package com.sandipsky.inventory_system.features.purchase.purchase_entry.repositories;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.PurchaseEntry;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;



public interface PurchaseEntryRepository extends JpaRepository<PurchaseEntry, Integer>, JpaSpecificationExecutor<PurchaseEntry> {
    List<PurchaseEntry> findByMasterPurchaseEntryId(Integer masterPurchaseEntryId);
}
