package com.sandipsky.inventory_system.features.reports.inventory.services;
import com.sandipsky.inventory_system.features.reports.inventory.dtos.ProductStockReportRowDTO;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.features.product.entities.ProductStock;
import com.sandipsky.inventory_system.features.product.repositories.ProductStockRepository;

@Service
public class ProductStockReportService {

    @Autowired
    private ProductStockRepository productStockRepository;

    public List<ProductStockReportRowDTO> getProductStockReport() {
        return productStockRepository.findAll().stream().map(this::mapToRow).toList();
    }

    private ProductStockReportRowDTO mapToRow(ProductStock entity) {
        ProductStockReportRowDTO row = new ProductStockReportRowDTO();
        row.setId(entity.getId());
        if (entity.getProduct() != null) {
            row.setProductId(entity.getProduct().getId());
            row.setProductName(entity.getProduct().getName());
        }
        row.setQuantity(entity.getQuantity());
        row.setCostPrice(entity.getCostPrice());
        row.setSellingPrice(entity.getSellingPrice());
        row.setMrp(entity.getMrp());
        double quantity = entity.getQuantity() != null ? entity.getQuantity() : 0;
        double costPrice = entity.getCostPrice() != null ? entity.getCostPrice() : 0;
        row.setStockValue(quantity * costPrice);
        return row;
    }
}
