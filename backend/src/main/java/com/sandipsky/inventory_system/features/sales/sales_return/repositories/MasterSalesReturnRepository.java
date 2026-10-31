package com.sandipsky.inventory_system.features.sales.sales_return.repositories;
import com.sandipsky.inventory_system.features.sales.sales_return.entities.MasterSalesReturn;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MasterSalesReturnRepository
        extends JpaRepository<MasterSalesReturn, Integer>, JpaSpecificationExecutor<MasterSalesReturn> {
    Optional<MasterSalesReturn> findTopByOrderByIdDesc();
}
