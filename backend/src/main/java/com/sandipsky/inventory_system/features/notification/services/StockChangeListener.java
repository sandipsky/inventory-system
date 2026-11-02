package com.sandipsky.inventory_system.features.notification.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import com.sandipsky.inventory_system.features.product.entities.ProductStock;

import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostUpdate;

// Reports every write to a batch's quantity, whichever service makes it, to LowStockService.
// Hibernate gets this listener from Spring; LowStockService is lazy because Hibernate asks for the
// listener while the repositories LowStockService needs are still being built.
@Component
public class StockChangeListener {

    @Lazy
    @Autowired
    private LowStockService lowStockService;

    @PostLoad
    void loaded(ProductStock batch) {
        batch.setSavedQuantity(batch.getQuantity());
    }

    @PostPersist
    @PostUpdate
    void saved(ProductStock batch) {
        double before = batch.getSavedQuantity() == null ? 0 : batch.getSavedQuantity();
        double after = batch.getQuantity() == null ? 0 : batch.getQuantity();
        batch.setSavedQuantity(batch.getQuantity());
        if (after != before && batch.getProduct() != null) {
            lowStockService.recordChange(batch.getProduct().getId(), after - before);
        }
    }
}
