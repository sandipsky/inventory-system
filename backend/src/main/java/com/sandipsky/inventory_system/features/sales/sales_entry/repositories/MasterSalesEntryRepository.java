package com.sandipsky.inventory_system.features.sales.sales_entry.repositories;
import com.sandipsky.inventory_system.features.sales.sales_entry.entities.MasterSalesEntry;


import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;



public interface MasterSalesEntryRepository extends JpaRepository<MasterSalesEntry, Integer>, JpaSpecificationExecutor<MasterSalesEntry> {
    Optional<MasterSalesEntry> findTopByOrderByIdDesc();
}
