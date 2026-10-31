package com.sandipsky.inventory_system.features.product.repositories;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductStockRepository
        extends JpaRepository<ProductStock, Integer>, JpaSpecificationExecutor<ProductStock> {

    ProductStock findByProductId(Integer productId);
}
