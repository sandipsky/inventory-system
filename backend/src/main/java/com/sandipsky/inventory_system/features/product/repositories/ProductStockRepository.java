package com.sandipsky.inventory_system.features.product.repositories;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductStockRepository
        extends JpaRepository<ProductStock, Integer>, JpaSpecificationExecutor<ProductStock> {

    List<ProductStock> findByProductId(Integer productId);

    ProductStock findByProductIdAndBatchNo(Integer productId, String batchNo);

    ProductStock findByProductIdAndBatchNoIsNull(Integer productId);
}
