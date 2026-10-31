package com.sandipsky.inventory_system.features.inventory.stock_edit.services;
import com.sandipsky.inventory_system.features.inventory.stock_edit.dtos.StockEditDTO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import java.util.Map;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;
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

    private final SpecificationBuilder<ProductStock> specBuilder = new SpecificationBuilder<>();

    public Page<StockEditDTO> getPaginatedProductStocksList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<ProductStock> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        Page<ProductStock> stockPage = productStockRepository.findAll(spec, pageable);
        return stockPage.map(this::mapToDTO);
    }

    public StockEditDTO getProductStockByProductId(int productId) {
        ProductStock productStock = productStockRepository.findByProductId(productId);
        if (productStock == null) {
            throw new ResourceNotFoundException("Product Stock not found");
        }
        return mapToDTO(productStock);
    }

    // Direct correction of the stored stock figures — no journal or document trail
    @Transactional
    public ProductStock updateProductStock(int productId, StockEditDTO dto) {
        ProductStock productStock = productStockRepository.findByProductId(productId);
        if (productStock == null) {
            throw new ResourceNotFoundException("Product Stock not found");
        }
        if (dto.getQuantity() == null || dto.getQuantity() < 0) {
            throw new BadRequestException("Stock quantity cannot be negative");
        }
        productStock.setQuantity(dto.getQuantity());
        productStock.setCostPrice(dto.getCostPrice());
        productStock.setSellingPrice(dto.getSellingPrice());
        productStock.setMrp(dto.getMrp());
        return productStockRepository.save(productStock);
    }

    private StockEditDTO mapToDTO(ProductStock entity) {
        StockEditDTO dto = new StockEditDTO();
        dto.setId(entity.getId());
        if (entity.getProduct() != null) {
            dto.setProductId(entity.getProduct().getId());
            dto.setProductName(entity.getProduct().getName());
        }
        dto.setQuantity(entity.getQuantity());
        dto.setCostPrice(entity.getCostPrice());
        dto.setSellingPrice(entity.getSellingPrice());
        dto.setMrp(entity.getMrp());
        return dto;
    }
}
