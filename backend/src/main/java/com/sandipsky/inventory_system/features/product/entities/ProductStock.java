package com.sandipsky.inventory_system.features.product.entities;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "product_stock")
public class ProductStock {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private int id;
    
    private Double quantity;

    private Double costPrice;

    private Double sellingPrice;
    
    private Double mrp;

    @OneToOne
    @JoinColumn(name = "product_id")
    private Product product;
}