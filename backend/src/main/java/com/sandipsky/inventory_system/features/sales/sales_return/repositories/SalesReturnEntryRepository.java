package com.sandipsky.inventory_system.features.sales.sales_return.repositories;
import com.sandipsky.inventory_system.features.sales.sales_return.entities.SalesReturnEntry;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SalesReturnEntryRepository
        extends JpaRepository<SalesReturnEntry, Integer>, JpaSpecificationExecutor<SalesReturnEntry> {
    List<SalesReturnEntry> findByMasterSalesReturnId(Integer masterSalesReturnId);
}
