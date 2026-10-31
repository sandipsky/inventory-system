package com.sandipsky.inventory_system.features.inventory.stock_adjustment.repositories;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.entities.StockAdjustmentEntry;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StockAdjustmentEntryRepository
        extends JpaRepository<StockAdjustmentEntry, Integer>, JpaSpecificationExecutor<StockAdjustmentEntry> {
    List<StockAdjustmentEntry> findByMasterStockAdjustmentId(Integer masterStockAdjustmentId);
}
