package com.sandipsky.inventory_system.features.inventory.stock_adjustment.services;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.dtos.StockAdjustmentEntryDTO;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.dtos.MasterStockAdjustmentDTO;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.entities.MasterStockAdjustment;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.entities.StockAdjustmentEntry;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.repositories.MasterStockAdjustmentRepository;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.repositories.StockAdjustmentEntryRepository;
import com.sandipsky.inventory_system.features.settings.document_numbering.services.DocumentNumberingService;
import com.sandipsky.inventory_system.features.notification.services.NotificationService;
import com.sandipsky.inventory_system.features.notification.services.NotificationType;

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
import com.sandipsky.inventory_system.features.product.services.ProductStockService;
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
    private ProductStockService productStockService;

    @Autowired
    private DocumentNumberingService documentNumberService;

    @Autowired
    private NotificationService notificationService;

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
                                if (item.getBatch() != null) {
                                    itemDto.setBatchId(productStockService.batchId(item.getBatch()));
                                    itemDto.setBatchNo(item.getBatch().getBatchNo());
                                }
                                return itemDto;
                            }).toList());
        }
        return dto;
    }

    @Transactional
    public MasterStockAdjustment saveMasterStockAdjustment(MasterStockAdjustmentDTO dto) {
        LineItemUtil.validateLines(dto.getStockAdjustmentEntries(), StockAdjustmentEntryDTO::getQuantity);
        List<StockAdjustmentEntryDTO> lines = dto.getStockAdjustmentEntries();
        rejectDuplicateBatches(lines);

        MasterStockAdjustment masterStockAdjustment = new MasterStockAdjustment();
        masterStockAdjustment.setDate(dto.getDate());
        masterStockAdjustment.setSystemEntryNo(documentNumberService.generateStockAdjustmentNumber());
        masterStockAdjustment.setRemarks(dto.getRemarks());

        MasterStockAdjustment savedEntry = repository.save(masterStockAdjustment);

        for (StockAdjustmentEntryDTO item : lines) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
            ProductStock batch = productStockService.findBatch(product, item.getBatchId());
            applyAdjustment(batch, item.getAdjustmentType(), item.getQuantity());

            StockAdjustmentEntry adjustmentEntry = new StockAdjustmentEntry();
            adjustmentEntry.setMasterStockAdjustmentId(savedEntry.getId());
            adjustmentEntry.setAdjustmentType(item.getAdjustmentType());
            adjustmentEntry.setQuantity(item.getQuantity());
            adjustmentEntry.setReason(item.getReason());
            adjustmentEntry.setProduct(product);
            adjustmentEntry.setBatch(batch);
            stockAdjustmentEntryRepository.save(adjustmentEntry);
        }

        notificationService.notifyActivity(NotificationType.STOCK_ADJUSTMENT, NotificationService.INFO,
                "Stock adjustment added", adjustmentMessage(savedEntry.getSystemEntryNo(), lines.size(),
                        savedEntry.getRemarks()));

        return savedEntry;
    }

    @Transactional
    public MasterStockAdjustment updateMasterStockAdjustment(int id, MasterStockAdjustmentDTO dto) {
        LineItemUtil.validateLines(dto.getStockAdjustmentEntries(), StockAdjustmentEntryDTO::getQuantity);
        List<StockAdjustmentEntryDTO> lines = dto.getStockAdjustmentEntries();
        rejectDuplicateBatches(lines);

        MasterStockAdjustment masterStockAdjustment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock Adjustment with Given Id not found"));
        masterStockAdjustment.setDate(dto.getDate());
        masterStockAdjustment.setRemarks(dto.getRemarks());

        MasterStockAdjustment savedEntry = repository.save(masterStockAdjustment);

        List<StockAdjustmentEntry> existingEntries = stockAdjustmentEntryRepository
                .findByMasterStockAdjustmentId(savedEntry.getId());
        List<Integer> incomingIds = new ArrayList<>();
        for (StockAdjustmentEntryDTO itemDto : lines) {
            incomingIds.add(itemDto.getId());
        }

        for (StockAdjustmentEntry existing : existingEntries) {
            if (!incomingIds.contains(existing.getId())) {
                reverseAdjustment(productStockService.lineBatch(existing.getBatch(), existing.getProduct()),
                        existing.getAdjustmentType(), existing.getQuantity());
                stockAdjustmentEntryRepository.delete(existing);
            }
        }

        for (StockAdjustmentEntryDTO item : lines) {
            StockAdjustmentEntry adjustmentEntry;
            if (item.getId() != 0) {
                adjustmentEntry = stockAdjustmentEntryRepository.findById(item.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Stock Adjustment Entry not found"));
                // Reverse the previous effect before applying the new one
                reverseAdjustment(
                        productStockService.lineBatch(adjustmentEntry.getBatch(), adjustmentEntry.getProduct()),
                        adjustmentEntry.getAdjustmentType(), adjustmentEntry.getQuantity());
            } else {
                adjustmentEntry = new StockAdjustmentEntry();
            }

            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
            ProductStock batch = productStockService.findBatch(product, item.getBatchId());
            applyAdjustment(batch, item.getAdjustmentType(), item.getQuantity());

            adjustmentEntry.setMasterStockAdjustmentId(savedEntry.getId());
            adjustmentEntry.setAdjustmentType(item.getAdjustmentType());
            adjustmentEntry.setQuantity(item.getQuantity());
            adjustmentEntry.setReason(item.getReason());
            adjustmentEntry.setProduct(product);
            adjustmentEntry.setBatch(batch);
            stockAdjustmentEntryRepository.save(adjustmentEntry);
        }

        return savedEntry;
    }

    @Transactional
    public void deleteMasterStockAdjustment(int id) {
        MasterStockAdjustment masterStockAdjustment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock Adjustment with Given Id not found"));

        for (StockAdjustmentEntry item : masterStockAdjustment.getStockAdjustmentEntries()) {
            reverseAdjustment(productStockService.lineBatch(item.getBatch(), item.getProduct()),
                    item.getAdjustmentType(), item.getQuantity());
            stockAdjustmentEntryRepository.deleteById(item.getId());
        }
        repository.deleteById(id);

        notificationService.notifyActivity(NotificationType.STOCK_ADJUSTMENT, NotificationService.WARN,
                "Stock adjustment deleted", adjustmentMessage(masterStockAdjustment.getSystemEntryNo(),
                        masterStockAdjustment.getStockAdjustmentEntries().size(), masterStockAdjustment.getRemarks()));
    }

    // "SA-000004, 3 lines: Damaged in transit."
    private static String adjustmentMessage(String systemEntryNo, int lines, String remarks) {
        String text = NotificationService.docNo(systemEntryNo) + ", " + lines + (lines == 1 ? " line" : " lines");
        return remarks == null || remarks.isBlank() ? text + "." : text + ": " + remarks.trim();
    }

    private void rejectDuplicateBatches(List<StockAdjustmentEntryDTO> lines) {
        LineItemUtil.rejectDuplicateBatches(lines,
                line -> List.of(line.getProductId(), line.getBatchId(), String.valueOf(line.getAdjustmentType())),
                line -> {
                    String product = productRepository.findById(line.getProductId()).map(Product::getName)
                            .orElse("Product " + line.getProductId());
                    String batch = line.getBatchId() == 0 ? null
                            : productStockRepository.findById(line.getBatchId()).map(ProductStock::getBatchNo)
                                    .orElse("#" + line.getBatchId());
                    return product + (batch == null ? " (default batch)" : " batch " + batch);
                });
    }

    private void applyAdjustment(ProductStock batch, String adjustmentType, Double quantity) {
        if (quantity == null || quantity <= 0) {
            throw new BadRequestException("Adjustment quantity must be greater than zero");
        }
        if ("In".equals(adjustmentType)) {
            changeStock(batch, quantity);
        } else if ("Out".equals(adjustmentType)) {
            changeStock(batch, -quantity);
        } else {
            throw new BadRequestException("Adjustment type must be either In or Out");
        }
    }

    private void reverseAdjustment(ProductStock batch, String adjustmentType, Double quantity) {
        if ("In".equals(adjustmentType)) {
            changeStock(batch, -quantity);
        } else {
            changeStock(batch, quantity);
        }
    }

    // A null batch is a default batch the product does not have yet
    private void changeStock(ProductStock productStock, Double delta) {
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
