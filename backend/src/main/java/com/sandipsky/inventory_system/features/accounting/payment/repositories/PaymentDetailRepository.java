package com.sandipsky.inventory_system.features.accounting.payment.repositories;
import com.sandipsky.inventory_system.features.accounting.payment.entities.PaymentDetail;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PaymentDetailRepository
        extends JpaRepository<PaymentDetail, Integer>, JpaSpecificationExecutor<PaymentDetail> {
    List<PaymentDetail> findByMasterPaymentId(Integer masterPaymentId);
}
