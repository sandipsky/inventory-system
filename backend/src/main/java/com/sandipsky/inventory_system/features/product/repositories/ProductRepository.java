package com.sandipsky.inventory_system.features.product.repositories;
import com.sandipsky.inventory_system.features.product.entities.Product;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO;

public interface ProductRepository extends JpaRepository<Product, Integer>, JpaSpecificationExecutor<Product> {
        boolean existsByName(String name);

        boolean existsByNameAndIdNot(String name, int id);

        @Query("""
                            SELECT new com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO(p.id, p.name)
                            FROM Product p
                            WHERE (:isService IS NULL OR p.isServiceItem = :isService)
                              AND (:isPurchasable IS NULL OR p.isPurchasable = :isPurchasable)
                              AND (:isSellable IS NULL OR p.isSellable = :isSellable)
                              AND (:isActive IS NULL OR p.isActive = :isActive)
                        """)
        List<DropdownDTO> findFilteredDropdown(Boolean isService, Boolean isPurchasable, Boolean isSellable,
                        Boolean isActive);

        @Query("""
                            SELECT p
                            FROM ProductStock p
                            WHERE p.product.id = :productId
                        """)
        ProductStock findByProductId(@Param("productId") Integer productId);
}
