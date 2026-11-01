package com.sandipsky.inventory_system.features.sales.sales_entry.repositories;
import com.sandipsky.inventory_system.features.sales.sales_entry.entities.MasterSalesEntry;


import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO;



public interface MasterSalesEntryRepository extends JpaRepository<MasterSalesEntry, Integer>, JpaSpecificationExecutor<MasterSalesEntry> {
    Optional<MasterSalesEntry> findTopByOrderByIdDesc();

    @Query("""
            SELECT new com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO(m.id, m.systemEntryNo)
            FROM MasterSalesEntry m
            WHERE m.customer.id = :customerId AND m.isCancelled = false
            ORDER BY m.id DESC
        """)
    List<DropdownDTO> findDropdownByCustomer(int customerId);
}
