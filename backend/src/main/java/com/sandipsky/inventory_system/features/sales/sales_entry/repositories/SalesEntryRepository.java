package com.sandipsky.inventory_system.features.sales.sales_entry.repositories;
import com.sandipsky.inventory_system.features.sales.sales_entry.entities.SalesEntry;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;



public interface SalesEntryRepository extends JpaRepository<SalesEntry, Integer>, JpaSpecificationExecutor<SalesEntry> {
    List<SalesEntry> findByMasterSalesEntryId(Integer masterSalesEntryId);
}
