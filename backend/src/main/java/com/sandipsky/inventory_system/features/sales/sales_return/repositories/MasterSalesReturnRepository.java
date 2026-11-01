package com.sandipsky.inventory_system.features.sales.sales_return.repositories;
import com.sandipsky.inventory_system.features.sales.sales_return.entities.MasterSalesReturn;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface MasterSalesReturnRepository
        extends JpaRepository<MasterSalesReturn, Integer>, JpaSpecificationExecutor<MasterSalesReturn> {
    Optional<MasterSalesReturn> findTopByOrderByIdDesc();

    @Query("""
            SELECT COUNT(m) > 0
            FROM MasterSalesReturn m
            WHERE m.refSales.id = :salesId AND m.isCancelled = false
        """)
    boolean existsByRefSalesIdAndIsCancelledFalse(int salesId);
}
