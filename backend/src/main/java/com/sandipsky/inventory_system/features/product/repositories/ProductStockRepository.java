package com.sandipsky.inventory_system.features.product.repositories;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductStockRepository
        extends JpaRepository<ProductStock, Integer>, JpaSpecificationExecutor<ProductStock> {

    List<ProductStock> findByProductId(Integer productId);

    ProductStock findByProductIdAndBatchNo(Integer productId, String batchNo);

    ProductStock findByProductIdAndBatchNoIsNull(Integer productId);

    // The product's stock with every batch added up
    @Query("SELECT COALESCE(SUM(s.quantity), 0) FROM ProductStock s WHERE s.product.id = :productId")
    double sumQuantityByProductId(@Param("productId") int productId);
}
