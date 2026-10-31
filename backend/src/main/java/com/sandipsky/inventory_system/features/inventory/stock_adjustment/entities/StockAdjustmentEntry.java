package com.sandipsky.inventory_system.features.inventory.stock_adjustment.entities;
import com.sandipsky.inventory_system.features.product.entities.Product;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "stock_adjustment_entry")
public class StockAdjustmentEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private int masterStockAdjustmentId;

    // "In" adds to stock, "Out" removes from stock
    private String adjustmentType;

    private Double quantity;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;
}
