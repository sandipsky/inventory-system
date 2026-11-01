package com.sandipsky.inventory_system.features.accounting.payment.repositories;
import com.sandipsky.inventory_system.features.accounting.payment.entities.MasterPayment;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MasterPaymentRepository
        extends JpaRepository<MasterPayment, Integer>, JpaSpecificationExecutor<MasterPayment> {
    Optional<MasterPayment> findTopByOrderByIdDesc();
}
