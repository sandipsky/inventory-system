package com.sandipsky.inventory_system.features.product.entities;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

// One batch of a product's stock. Batch numbers are unique per product; a null batch number
// is the product's default batch, used when a purchase names no batch.
@Entity
@Getter
@Setter
@Table(name = "product_stock", uniqueConstraints = {
        @UniqueConstraint(name = "unique_product_batch_no", columnNames = { "product_id", "batchNo" }) })
public class ProductStock {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private int id;

    private String batchNo;

    private String expiryDate;
    
    private Double quantity;

    private Double costPrice;

    private Double sellingPrice;
    
    private Double mrp;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;
}
