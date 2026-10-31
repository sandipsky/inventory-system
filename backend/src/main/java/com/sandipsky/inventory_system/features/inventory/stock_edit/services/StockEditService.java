package com.sandipsky.inventory_system.features.inventory.stock_edit.services;
import com.sandipsky.inventory_system.features.inventory.stock_edit.dtos.StockEditDTO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import java.util.Map;
import com.sandipsky.inventory_system.features.product.entities.Product;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;
import com.sandipsky.inventory_system.features.product.repositories.ProductRepository;
import com.sandipsky.inventory_system.features.product.services.ProductStockService;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.product.repositories.ProductStockRepository;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;

@Service
public class StockEditService {

    @Autowired
    private ProductStockRepository productStockRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductStockService productStockService;

    private final SpecificationBuilder<ProductStock> specBuilder = new SpecificationBuilder<>();

    public Page<StockEditDTO> getPaginatedProductStocksList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<ProductStock> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        Page<ProductStock> stockPage = productStockRepository.findAll(spec, pageable);
        return stockPage.map(this::mapToDTO);
    }

    public StockEditDTO getProductStock(int productId, int batchId) {
        return mapToDTO(findBatch(productId, batchId));
    }

    // Direct correction of one batch's stored stock figures — no journal or document trail
    @Transactional
    public ProductStock updateProductStock(int productId, int batchId, StockEditDTO dto) {
        ProductStock productStock = findBatch(productId, batchId);
        if (dto.getQuantity() == null || dto.getQuantity() < 0) {
            throw new BadRequestException("Stock quantity cannot be negative");
        }
        productStock.setExpiryDate(dto.getExpiryDate());
        productStock.setQuantity(dto.getQuantity());
        productStock.setCostPrice(dto.getCostPrice());
        productStock.setSellingPrice(dto.getSellingPrice());
        productStock.setMrp(dto.getMrp());
        return productStockRepository.save(productStock);
    }

    // Batch id 0 is the product's default batch
    private ProductStock findBatch(int productId, int batchId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        ProductStock productStock = productStockService.findBatch(product, batchId);
        if (productStock == null) {
            throw new ResourceNotFoundException("Product Stock not found");
        }
        return productStock;
    }

    private StockEditDTO mapToDTO(ProductStock entity) {
        StockEditDTO dto = new StockEditDTO();
        dto.setId(entity.getId());
        dto.setBatchId(productStockService.batchId(entity));
        if (entity.getProduct() != null) {
            dto.setProductId(entity.getProduct().getId());
            dto.setProductName(entity.getProduct().getName());
        }
        dto.setBatchNo(entity.getBatchNo());
        dto.setExpiryDate(entity.getExpiryDate());
        dto.setQuantity(entity.getQuantity());
        dto.setCostPrice(entity.getCostPrice());
        dto.setSellingPrice(entity.getSellingPrice());
        dto.setMrp(entity.getMrp());
        return dto;
    }
}
