package com.sandipsky.inventory_system.features.inventory.stock_adjustment.repositories;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.entities.MasterStockAdjustment;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MasterStockAdjustmentRepository
        extends JpaRepository<MasterStockAdjustment, Integer>, JpaSpecificationExecutor<MasterStockAdjustment> {
    Optional<MasterStockAdjustment> findTopByOrderByIdDesc();
}
