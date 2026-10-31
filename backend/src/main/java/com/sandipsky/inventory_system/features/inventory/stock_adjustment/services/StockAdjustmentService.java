package com.sandipsky.inventory_system.features.inventory.stock_adjustment.services;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.dtos.StockAdjustmentEntryDTO;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.dtos.MasterStockAdjustmentDTO;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.entities.MasterStockAdjustment;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.entities.StockAdjustmentEntry;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.repositories.MasterStockAdjustmentRepository;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.repositories.StockAdjustmentEntryRepository;
import com.sandipsky.inventory_system.features.settings.document_numbering.services.DocumentNumberingService;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import java.util.Map;
import com.sandipsky.inventory_system.features.product.entities.Product;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.product.repositories.ProductRepository;
import com.sandipsky.inventory_system.features.product.repositories.ProductStockRepository;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import com.sandipsky.inventory_system.common.util.LineItemUtil;

@Service
public class StockAdjustmentService {

    @Autowired
    private MasterStockAdjustmentRepository repository;

    @Autowired
    private StockAdjustmentEntryRepository stockAdjustmentEntryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductStockRepository productStockRepository;

    @Autowired
    private DocumentNumberingService documentNumberService;

    private final SpecificationBuilder<MasterStockAdjustment> specBuilder = new SpecificationBuilder<>();

    public Page<MasterStockAdjustmentDTO> getPaginatedMasterStockAdjustmentsList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<MasterStockAdjustment> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        Page<MasterStockAdjustment> adjustmentPage = repository.findAll(spec, pageable);
        return adjustmentPage.map(this::mapToDTO);
    }

    public MasterStockAdjustmentDTO getMasterStockAdjustmentById(int id) {
        MasterStockAdjustment masterStockAdjustment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock Adjustment with Given Id not found"));
        MasterStockAdjustmentDTO dto = mapToDTO(masterStockAdjustment);

        if (masterStockAdjustment.getStockAdjustmentEntries() != null) {
            dto.setStockAdjustmentEntries(
                    masterStockAdjustment.getStockAdjustmentEntries().stream()
                            .map(item -> {
                                StockAdjustmentEntryDTO itemDto = new StockAdjustmentEntryDTO();
                                itemDto.setId(item.getId());
                                itemDto.setMasterStockAdjustmentId(item.getMasterStockAdjustmentId());
                                itemDto.setAdjustmentType(item.getAdjustmentType());
                                itemDto.setQuantity(item.getQuantity());
                                itemDto.setReason(item.getReason());
                                itemDto.setProductId(item.getProduct().getId());
                                itemDto.setProductName(item.getProduct().getName());
                                return itemDto;
                            }).toList());
        }
        return dto;
    }

    @Transactional
    public MasterStockAdjustment saveMasterStockAdjustment(MasterStockAdjustmentDTO dto) {
        LineItemUtil.validateLines(dto.getStockAdjustmentEntries(), StockAdjustmentEntryDTO::getQuantity);

        MasterStockAdjustment masterStockAdjustment = new MasterStockAdjustment();
        masterStockAdjustment.setDate(dto.getDate());
        masterStockAdjustment.setSystemEntryNo(documentNumberService.generateStockAdjustmentNumber());
        masterStockAdjustment.setRemarks(dto.getRemarks());

        MasterStockAdjustment savedEntry = repository.save(masterStockAdjustment);

        if (dto.getStockAdjustmentEntries() != null) {
            for (StockAdjustmentEntryDTO item : dto.getStockAdjustmentEntries()) {
                Product product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

                StockAdjustmentEntry adjustmentEntry = new StockAdjustmentEntry();
                adjustmentEntry.setMasterStockAdjustmentId(savedEntry.getId());
                adjustmentEntry.setAdjustmentType(item.getAdjustmentType());
                adjustmentEntry.setQuantity(item.getQuantity());
                adjustmentEntry.setReason(item.getReason());
                adjustmentEntry.setProduct(product);
                stockAdjustmentEntryRepository.save(adjustmentEntry);

                applyAdjustment(product.getId(), item.getAdjustmentType(), item.getQuantity());
            }
        }

        return savedEntry;
    }

    @Transactional
    public MasterStockAdjustment updateMasterStockAdjustment(int id, MasterStockAdjustmentDTO dto) {
        LineItemUtil.validateLines(dto.getStockAdjustmentEntries(), StockAdjustmentEntryDTO::getQuantity);

        MasterStockAdjustment masterStockAdjustment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock Adjustment with Given Id not found"));
        masterStockAdjustment.setDate(dto.getDate());
        masterStockAdjustment.setRemarks(dto.getRemarks());

        MasterStockAdjustment savedEntry = repository.save(masterStockAdjustment);

        List<StockAdjustmentEntry> existingEntries = stockAdjustmentEntryRepository
                .findByMasterStockAdjustmentId(savedEntry.getId());
        List<Integer> incomingIds = new ArrayList<>();
        if (dto.getStockAdjustmentEntries() != null) {
            for (StockAdjustmentEntryDTO itemDto : dto.getStockAdjustmentEntries()) {
                incomingIds.add(itemDto.getId());
            }
        }

        for (StockAdjustmentEntry existing : existingEntries) {
            if (!incomingIds.contains(existing.getId())) {
                reverseAdjustment(existing.getProduct().getId(), existing.getAdjustmentType(),
                        existing.getQuantity());
                stockAdjustmentEntryRepository.delete(existing);
            }
        }

        if (dto.getStockAdjustmentEntries() != null) {
            for (StockAdjustmentEntryDTO item : dto.getStockAdjustmentEntries()) {
                StockAdjustmentEntry adjustmentEntry;
                if (item.getId() != 0) {
                    adjustmentEntry = stockAdjustmentEntryRepository.findById(item.getId())
                            .orElseThrow(() -> new ResourceNotFoundException("Stock Adjustment Entry not found"));
                    // Reverse the previous effect before applying the new one
                    reverseAdjustment(adjustmentEntry.getProduct().getId(), adjustmentEntry.getAdjustmentType(),
                            adjustmentEntry.getQuantity());
                } else {
                    adjustmentEntry = new StockAdjustmentEntry();
                }

                Product product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

                adjustmentEntry.setMasterStockAdjustmentId(savedEntry.getId());
                adjustmentEntry.setAdjustmentType(item.getAdjustmentType());
                adjustmentEntry.setQuantity(item.getQuantity());
                adjustmentEntry.setReason(item.getReason());
                adjustmentEntry.setProduct(product);
                stockAdjustmentEntryRepository.save(adjustmentEntry);

                applyAdjustment(product.getId(), item.getAdjustmentType(), item.getQuantity());
            }
        }

        return savedEntry;
    }

    @Transactional
    public void deleteMasterStockAdjustment(int id) {
        MasterStockAdjustment masterStockAdjustment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock Adjustment with Given Id not found"));

        for (StockAdjustmentEntry item : masterStockAdjustment.getStockAdjustmentEntries()) {
            reverseAdjustment(item.getProduct().getId(), item.getAdjustmentType(), item.getQuantity());
            stockAdjustmentEntryRepository.deleteById(item.getId());
        }
        repository.deleteById(id);
    }

    private void applyAdjustment(int productId, String adjustmentType, Double quantity) {
        if (quantity == null || quantity <= 0) {
            throw new BadRequestException("Adjustment quantity must be greater than zero");
        }
        if ("In".equals(adjustmentType)) {
            changeStock(productId, quantity);
        } else if ("Out".equals(adjustmentType)) {
            changeStock(productId, -quantity);
        } else {
            throw new BadRequestException("Adjustment type must be either In or Out");
        }
    }

    private void reverseAdjustment(int productId, String adjustmentType, Double quantity) {
        if ("In".equals(adjustmentType)) {
            changeStock(productId, -quantity);
        } else {
            changeStock(productId, quantity);
        }
    }

    private void changeStock(int productId, Double delta) {
        ProductStock productStock = productStockRepository.findByProductId(productId);
        if (productStock == null) {
            throw new BadRequestException("Product has no stock yet. Add opening stock or a purchase first");
        }
        Double newStock = productStock.getQuantity() + delta;
        if (newStock < 0) {
            throw new BadRequestException("Not enough Quantity In Stock");
        }
        productStock.setQuantity(newStock);
        productStockRepository.save(productStock);
    }

    private MasterStockAdjustmentDTO mapToDTO(MasterStockAdjustment entity) {
        MasterStockAdjustmentDTO dto = new MasterStockAdjustmentDTO();
        dto.setId(entity.getId());
        dto.setDate(entity.getDate());
        dto.setSystemEntryNo(entity.getSystemEntryNo());
        dto.setRemarks(entity.getRemarks());
        return dto;
    }
}
