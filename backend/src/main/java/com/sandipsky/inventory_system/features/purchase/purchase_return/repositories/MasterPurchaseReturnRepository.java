package com.sandipsky.inventory_system.features.purchase.purchase_return.repositories;
import com.sandipsky.inventory_system.features.purchase.purchase_return.entities.MasterPurchaseReturn;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MasterPurchaseReturnRepository
        extends JpaRepository<MasterPurchaseReturn, Integer>, JpaSpecificationExecutor<MasterPurchaseReturn> {
    Optional<MasterPurchaseReturn> findTopByOrderByIdDesc();
}
