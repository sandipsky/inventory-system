package com.sandipsky.inventory_system.features.accounting.payment.repositories;
import com.sandipsky.inventory_system.features.accounting.payment.entities.MasterPayment;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface MasterPaymentRepository
        extends JpaRepository<MasterPayment, Integer>, JpaSpecificationExecutor<MasterPayment> {
    Optional<MasterPayment> findTopByOrderByIdDesc();

    @Query("""
                SELECT p
                FROM MasterPayment p
                WHERE p.unadjustedAmount > 0
                ORDER BY p.id DESC
            """)
    List<MasterPayment> findAllWithUnadjustedAmount();
}
