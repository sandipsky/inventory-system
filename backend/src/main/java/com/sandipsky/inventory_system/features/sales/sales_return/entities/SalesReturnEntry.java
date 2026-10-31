package com.sandipsky.inventory_system.features.sales.sales_return.entities;
import com.sandipsky.inventory_system.features.product.entities.Product;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "sales_return_entry")
public class SalesReturnEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private int masterSalesReturnId;

    private Double quantity;

    private Double costPrice;

    private Double sellingPrice;

    private Double mrp;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    // The batch this line moved stock in
    @ManyToOne
    @JoinColumn(name = "batch_id")
    private ProductStock batch;
}
