package com.sandipsky.inventory_system.features.purchase.purchase_return.repositories;
import com.sandipsky.inventory_system.features.purchase.purchase_return.entities.PurchaseReturnEntry;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PurchaseReturnEntryRepository
        extends JpaRepository<PurchaseReturnEntry, Integer>, JpaSpecificationExecutor<PurchaseReturnEntry> {
    List<PurchaseReturnEntry> findByMasterPurchaseReturnId(Integer masterPurchaseReturnId);
}
