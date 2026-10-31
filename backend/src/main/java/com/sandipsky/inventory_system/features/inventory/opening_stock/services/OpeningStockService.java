package com.sandipsky.inventory_system.features.inventory.opening_stock.services;
import com.sandipsky.inventory_system.features.inventory.opening_stock.dtos.OpeningStockDTO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import java.util.Map;
import com.sandipsky.inventory_system.features.product.entities.Product;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;
import com.sandipsky.inventory_system.features.product.services.ProductStockService;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.DuplicateResourceException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.product.repositories.ProductRepository;
import com.sandipsky.inventory_system.features.product.repositories.ProductStockRepository;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;

@Service
public class OpeningStockService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductStockRepository productStockRepository;

    @Autowired
    private ProductStockService productStockService;

    private final SpecificationBuilder<ProductStock> specBuilder = new SpecificationBuilder<>();

    public Page<OpeningStockDTO> getPaginatedOpeningStocksList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<ProductStock> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        Page<ProductStock> stockPage = productStockRepository.findAll(spec, pageable);
        return stockPage.map(this::mapToDTO);
    }

    // Opening stock initializes a batch (the default one when no batch number is given) that
    // the product does not have yet
    @Transactional
    public ProductStock saveOpeningStock(OpeningStockDTO dto) {
        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        ProductStock productStock = productStockService.findOrCreateBatch(product, dto.getBatchNo(), null);
        if (productStock.getId() != 0) {
            throw new DuplicateResourceException(
                    "Stock already exists for this product batch. Use Stock Adjustment or Stock Edit instead.");
        }
        productStock.setExpiryDate(dto.getExpiryDate());
        if (dto.getQuantity() == null || dto.getQuantity() < 0) {
            throw new BadRequestException("Opening quantity cannot be negative");
        }

        productStock.setQuantity(dto.getQuantity());
        productStock.setCostPrice(dto.getCostPrice());
        productStock.setSellingPrice(dto.getSellingPrice());
        productStock.setMrp(dto.getMrp());
        return productStockRepository.save(productStock);
    }

    private OpeningStockDTO mapToDTO(ProductStock entity) {
        OpeningStockDTO dto = new OpeningStockDTO();
        dto.setId(entity.getId());
        if (entity.getProduct() != null) {
            dto.setProductId(entity.getProduct().getId());
            dto.setProductName(entity.getProduct().getName());
        }
        dto.setBatchId(productStockService.batchId(entity));
        dto.setBatchNo(entity.getBatchNo());
        dto.setExpiryDate(entity.getExpiryDate());
        dto.setQuantity(entity.getQuantity());
        dto.setCostPrice(entity.getCostPrice());
        dto.setSellingPrice(entity.getSellingPrice());
        dto.setMrp(entity.getMrp());
        return dto;
    }
}
