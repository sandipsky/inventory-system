package com.sandipsky.inventory_system.features.product.entities;
import com.sandipsky.inventory_system.features.masters.unit.entities.Unit;
import com.sandipsky.inventory_system.features.masters.taxtype.entities.TaxType;
import com.sandipsky.inventory_system.features.masters.packing.entities.Packing;
import com.sandipsky.inventory_system.features.masters.category.entities.Category;

import java.util.List;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "product")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(nullable = false, unique = true)
    private String name;

    private String code;

    private String barcode;

    private boolean isActive;

    private Double costPrice;

    private Double sellingPrice;

    private Double mrp;

    private Double maxStock;

    private Double minStock;

    private String valuationMethod;

    private boolean isBatchAvailable = false;

    private boolean hasExpiryDate = false;

    private boolean hasManufacturingDate = false;

    private boolean isServiceItem = false;
    
    private boolean isPurchasable = true;
    
    private boolean isSellable = true;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne
    @JoinColumn(name = "unit_id")
    private Unit unit;

    @ManyToOne
    @JoinColumn(name = "packing_id")
    private Packing packing;

    @ManyToOne
    @JoinColumn(name = "tax_type_id")
    private TaxType taxType;

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @JoinColumn(name = "product_id", referencedColumnName = "id")
    private List<BonusInfo> bonusInfos;
}
