package com.sandipsky.inventory_system.features.purchase.purchase_entry.repositories;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.MasterPurchaseEntry;


import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO;



public interface MasterPurchaseEntryRepository extends JpaRepository<MasterPurchaseEntry, Integer>, JpaSpecificationExecutor<MasterPurchaseEntry> {
    Optional<MasterPurchaseEntry> findTopByOrderByIdDesc();

    @Query("""
            SELECT new com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO(m.id, m.systemEntryNo)
            FROM MasterPurchaseEntry m
            WHERE m.vendor.id = :vendorId
            ORDER BY m.id DESC
        """)
    List<DropdownDTO> findDropdownByVendor(int vendorId);
}
