package com.sandipsky.inventory_system.features.purchase.purchase_return.entities;
import com.sandipsky.inventory_system.features.product.entities.Product;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "purchase_return_entry")
public class PurchaseReturnEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private int masterPurchaseReturnId;

    private Double quantity;

    private Double costPrice;

    private Double sellingPrice;

    private Double mrp;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;
}
