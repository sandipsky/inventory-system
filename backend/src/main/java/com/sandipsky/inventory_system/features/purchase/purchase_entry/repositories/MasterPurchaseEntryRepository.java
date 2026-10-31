package com.sandipsky.inventory_system.features.purchase.purchase_entry.repositories;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.MasterPurchaseEntry;


import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;



public interface MasterPurchaseEntryRepository extends JpaRepository<MasterPurchaseEntry, Integer>, JpaSpecificationExecutor<MasterPurchaseEntry> {
    Optional<MasterPurchaseEntry> findTopByOrderByIdDesc();
}
