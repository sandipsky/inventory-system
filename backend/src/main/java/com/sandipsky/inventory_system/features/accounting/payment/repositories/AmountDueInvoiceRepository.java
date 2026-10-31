package com.sandipsky.inventory_system.features.accounting.payment.repositories;
import com.sandipsky.inventory_system.features.accounting.payment.entities.AmountDueInvoice;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AmountDueInvoiceRepository
        extends JpaRepository<AmountDueInvoice, Integer>, JpaSpecificationExecutor<AmountDueInvoice> {
    Optional<AmountDueInvoice> findByInvoiceNumber(String invoiceNumber);
}
