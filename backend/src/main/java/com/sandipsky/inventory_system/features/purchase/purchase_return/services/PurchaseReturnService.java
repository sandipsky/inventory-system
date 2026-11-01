package com.sandipsky.inventory_system.features.purchase.purchase_return.services;
import com.sandipsky.inventory_system.features.purchase.purchase_return.dtos.PurchaseReturnEntryDTO;
import com.sandipsky.inventory_system.features.purchase.purchase_return.entities.PurchaseReturnEntry;
import com.sandipsky.inventory_system.features.purchase.purchase_return.repositories.PurchaseReturnEntryRepository;
import com.sandipsky.inventory_system.features.purchase.purchase_return.repositories.MasterPurchaseReturnRepository;
import com.sandipsky.inventory_system.features.purchase.purchase_return.dtos.MasterPurchaseReturnDTO;
import com.sandipsky.inventory_system.features.purchase.purchase_return.entities.MasterPurchaseReturn;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.MasterPurchaseEntry;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.repositories.MasterPurchaseEntryRepository;
import com.sandipsky.inventory_system.features.settings.document_numbering.services.DocumentNumberingService;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import java.util.Map;
import com.sandipsky.inventory_system.features.accounting.account.entities.AccountMaster;
import com.sandipsky.inventory_system.features.accounting.journal.entities.JournalEntry;
import com.sandipsky.inventory_system.features.accounting.journal.entities.MasterJournalEntry;
import com.sandipsky.inventory_system.features.purchase.vendor.entities.Vendor;
import com.sandipsky.inventory_system.features.product.entities.Product;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.accounting.account.repositories.AccountMasterRepository;
import com.sandipsky.inventory_system.features.accounting.journal.repositories.JournalEntryRepository;
import com.sandipsky.inventory_system.features.accounting.journal.repositories.MasterJournalEntryRepository;
import com.sandipsky.inventory_system.features.purchase.vendor.repositories.VendorRepository;
import com.sandipsky.inventory_system.features.product.repositories.ProductRepository;
import com.sandipsky.inventory_system.features.product.repositories.ProductStockRepository;
import com.sandipsky.inventory_system.features.product.services.ProductStockService;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import com.sandipsky.inventory_system.common.util.LineItemUtil;

@Service
public class PurchaseReturnService {

    @Autowired
    private MasterPurchaseReturnRepository repository;

    @Autowired
    private PurchaseReturnEntryRepository purchaseReturnEntryRepository;

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductStockRepository productStockRepository;

    @Autowired
    private ProductStockService productStockService;

    @Autowired
    private MasterJournalEntryRepository masterJournalEntryRepository;

    @Autowired
    private JournalEntryRepository journalEntryRepository;

    @Autowired
    private AccountMasterRepository accountMasterRepository;

    @Autowired
    private MasterPurchaseEntryRepository purchaseEntryRepository;

    @Autowired
    private DocumentNumberingService documentNumberService;

    private final SpecificationBuilder<MasterPurchaseReturn> specBuilder = new SpecificationBuilder<>();

    public Page<MasterPurchaseReturnDTO> getPaginatedMasterPurchaseReturnsList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<MasterPurchaseReturn> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        Page<MasterPurchaseReturn> returnPage = repository.findAll(spec, pageable);
        return returnPage.map(this::mapToDTO);
    }

    public MasterPurchaseReturnDTO getMasterPurchaseReturnById(int id) {
        MasterPurchaseReturn masterPurchaseReturn = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Return with Given Id not found"));
        MasterPurchaseReturnDTO dto = mapToDTO(masterPurchaseReturn);

        if (masterPurchaseReturn.getPurchaseReturnEntries() != null) {
            dto.setPurchaseReturnEntries(
                    masterPurchaseReturn.getPurchaseReturnEntries().stream()
                            .map(item -> {
                                PurchaseReturnEntryDTO itemDto = new PurchaseReturnEntryDTO();
                                itemDto.setId(item.getId());
                                itemDto.setQuantity(item.getQuantity());
                                itemDto.setCostPrice(item.getCostPrice());
                                itemDto.setSellingPrice(item.getSellingPrice());
                                itemDto.setMrp(item.getMrp());
                                itemDto.setMasterPurchaseReturnId(item.getMasterPurchaseReturnId());
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
    public MasterPurchaseReturn saveMasterPurchaseReturn(MasterPurchaseReturnDTO dto) {
        LineItemUtil.validateLines(dto.getPurchaseReturnEntries(), PurchaseReturnEntryDTO::getQuantity);
        List<PurchaseReturnEntryDTO> lines = dto.getPurchaseReturnEntries();
        rejectDuplicateBatches(lines);

        MasterPurchaseReturn masterPurchaseReturn = new MasterPurchaseReturn();
        masterPurchaseReturn.setSystemEntryNo(documentNumberService.generatePurchaseReturnNumber());
        mapDtoToEntity(dto, masterPurchaseReturn);

        MasterPurchaseReturn savedEntry = repository.save(masterPurchaseReturn);

        for (PurchaseReturnEntryDTO item : lines) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

            // Returning goods to vendor reduces the batch picked on the line
            ProductStock batch = productStockService.findBatch(product, item.getBatchId());
            removeFromStock(batch, item.getQuantity());

            PurchaseReturnEntry returnEntry = new PurchaseReturnEntry();
            returnEntry.setQuantity(item.getQuantity());
            returnEntry.setCostPrice(item.getCostPrice());
            returnEntry.setSellingPrice(item.getSellingPrice());
            returnEntry.setMrp(item.getMrp());
            returnEntry.setMasterPurchaseReturnId(savedEntry.getId());
            returnEntry.setProduct(product);
            returnEntry.setBatch(batch);
            purchaseReturnEntryRepository.save(returnEntry);
        }

        createJournalEntries(savedEntry);

        return savedEntry;
    }

    @Transactional
    public MasterPurchaseReturn updateMasterPurchaseReturn(int id, MasterPurchaseReturnDTO dto) {
        LineItemUtil.validateLines(dto.getPurchaseReturnEntries(), PurchaseReturnEntryDTO::getQuantity);
        List<PurchaseReturnEntryDTO> lines = dto.getPurchaseReturnEntries();
        rejectDuplicateBatches(lines);

        MasterPurchaseReturn masterPurchaseReturn = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Return with Given Id not found"));
        mapDtoToEntity(dto, masterPurchaseReturn);

        MasterPurchaseReturn savedEntry = repository.save(masterPurchaseReturn);

        List<PurchaseReturnEntry> existingEntries = purchaseReturnEntryRepository
                .findByMasterPurchaseReturnId(savedEntry.getId());
        List<Integer> incomingIds = new ArrayList<>();
        for (PurchaseReturnEntryDTO itemDto : lines) {
            incomingIds.add(itemDto.getId());
        }

        for (PurchaseReturnEntry existing : existingEntries) {
            if (!incomingIds.contains(existing.getId())) {
                // Removed return line: goods stay with us, add the quantity back
                addToStock(productStockService.lineBatch(existing.getBatch(), existing.getProduct()),
                        existing.getQuantity());
                purchaseReturnEntryRepository.delete(existing);
            }
        }

        for (PurchaseReturnEntryDTO item : lines) {
            PurchaseReturnEntry returnEntry;
            if (item.getId() != 0) {
                returnEntry = purchaseReturnEntryRepository.findById(item.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Purchase Return Entry not found"));
                // Reverse the previously returned quantity in the batch it came out of
                addToStock(productStockService.lineBatch(returnEntry.getBatch(), returnEntry.getProduct()),
                        returnEntry.getQuantity());
            } else {
                returnEntry = new PurchaseReturnEntry();
            }

            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

            // Then return the new quantity from the batch picked now
            ProductStock batch = productStockService.findBatch(product, item.getBatchId());
            removeFromStock(batch, item.getQuantity());

            returnEntry.setQuantity(item.getQuantity());
            returnEntry.setCostPrice(item.getCostPrice());
            returnEntry.setSellingPrice(item.getSellingPrice());
            returnEntry.setMrp(item.getMrp());
            returnEntry.setMasterPurchaseReturnId(savedEntry.getId());
            returnEntry.setProduct(product);
            returnEntry.setBatch(batch);
            purchaseReturnEntryRepository.save(returnEntry);
        }

        createJournalEntries(savedEntry);

        return savedEntry;
    }

    @Transactional
    public void deleteMasterPurchaseReturn(int id) {
        MasterPurchaseReturn masterPurchaseReturn = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Return with Given Id not found"));

        for (PurchaseReturnEntry item : masterPurchaseReturn.getPurchaseReturnEntries()) {
            // Deleting the return brings the goods back into stock
            addToStock(productStockService.lineBatch(item.getBatch(), item.getProduct()), item.getQuantity());
            purchaseReturnEntryRepository.deleteById(item.getId());
        }

        deleteJournalEntries(id);
        repository.deleteById(id);
    }

    private void rejectDuplicateBatches(List<PurchaseReturnEntryDTO> lines) {
        LineItemUtil.rejectDuplicateBatches(lines,
                line -> List.of(line.getProductId(), line.getBatchId()),
                line -> {
                    String product = productRepository.findById(line.getProductId()).map(Product::getName)
                            .orElse("Product " + line.getProductId());
                    String batch = line.getBatchId() == 0 ? null
                            : productStockRepository.findById(line.getBatchId()).map(ProductStock::getBatchNo)
                                    .orElse("#" + line.getBatchId());
                    return product + (batch == null ? " (default batch)" : " batch " + batch);
                });
    }

    private void addToStock(ProductStock productStock, Double quantity) {
        productStock.setQuantity(productStock.getQuantity() + quantity);
        productStockRepository.save(productStock);
    }

    // A null batch is a default batch the product does not have yet
    private void removeFromStock(ProductStock productStock, Double quantity) {
        if (productStock == null) {
            throw new BadRequestException("Not enough Quantity In Stock");
        }
        Double newStock = productStock.getQuantity() - quantity;
        if (newStock < 0) {
            throw new BadRequestException("Not enough Quantity In Stock");
        }
        productStock.setQuantity(newStock);
        productStockRepository.save(productStock);
    }

    private void mapDtoToEntity(MasterPurchaseReturnDTO dto, MasterPurchaseReturn masterPurchaseReturn) {
        masterPurchaseReturn.setDate(dto.getDate());
        masterPurchaseReturn.setBillNo(dto.getBillNo());
        masterPurchaseReturn.setTransactionType(dto.getTransactionType());
        masterPurchaseReturn.setSubTotal(dto.getSubTotal());
        masterPurchaseReturn.setDiscount(dto.getDiscount());
        masterPurchaseReturn.setNonTaxableAmount(dto.getNonTaxableAmount());
        masterPurchaseReturn.setTaxableAmount(dto.getTaxableAmount());
        masterPurchaseReturn.setTotalTax(dto.getTotalTax());
        masterPurchaseReturn.setRounded(dto.isRounded());
        masterPurchaseReturn.setRounding(dto.getRounding());
        masterPurchaseReturn.setGrandTotal(dto.getGrandTotal());
        masterPurchaseReturn.setDiscountType(dto.getDiscountType());
        Vendor vendor = vendorRepository.findById(dto.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));
        masterPurchaseReturn.setVendor(vendor);
        masterPurchaseReturn.setRefPurchase(refPurchase(dto.getRefPurchaseId(), vendor));

        if (dto.getRemarks() == null || dto.getRemarks().isEmpty()) {
            masterPurchaseReturn.setRemarks("Returned Goods to " + vendor.getName());
        } else {
            masterPurchaseReturn.setRemarks(dto.getRemarks());
        }
    }

    // The purchase a return is made against must be from the same vendor
    private MasterPurchaseEntry refPurchase(Integer refPurchaseId, Vendor vendor) {
        if (refPurchaseId == null || refPurchaseId == 0) {
            return null;
        }
        MasterPurchaseEntry purchase = purchaseEntryRepository.findById(refPurchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Reference purchase not found"));
        if (purchase.getVendor() == null || purchase.getVendor().getId() != vendor.getId()) {
            throw new BadRequestException("Reference purchase belongs to another vendor");
        }
        return purchase;
    }

    private MasterPurchaseReturnDTO mapToDTO(MasterPurchaseReturn entity) {
        MasterPurchaseReturnDTO dto = new MasterPurchaseReturnDTO();
        dto.setId(entity.getId());
        dto.setDate(entity.getDate());
        dto.setSystemEntryNo(entity.getSystemEntryNo());
        dto.setBillNo(entity.getBillNo());
        dto.setTransactionType(entity.getTransactionType());
        dto.setSubTotal(entity.getSubTotal());
        dto.setDiscount(entity.getDiscount());
        dto.setNonTaxableAmount(entity.getNonTaxableAmount());
        dto.setTaxableAmount(entity.getTaxableAmount());
        dto.setTotalTax(entity.getTotalTax());
        dto.setRounded(entity.isRounded());
        dto.setRounding(entity.getRounding());
        dto.setGrandTotal(entity.getGrandTotal());
        dto.setDiscountType(entity.getDiscountType());
        dto.setRemarks(entity.getRemarks());
        if (entity.getRefPurchase() != null) {
            dto.setRefPurchaseId(entity.getRefPurchase().getId());
            dto.setRefPurchaseNo(entity.getRefPurchase().getSystemEntryNo());
        }
        if (entity.getVendor() != null) {
            dto.setVendorId(entity.getVendor().getId());
            dto.setVendorName(entity.getVendor().getName());
        }
        return dto;
    }

    private void deleteJournalEntries(int masterPurchaseReturnId) {
        MasterJournalEntry existing = masterJournalEntryRepository
                .findByMasterPurchaseReturnId(masterPurchaseReturnId).orElse(null);
        if (existing != null) {
            for (JournalEntry existingEntry : existing.getJournalEntries()) {
                journalEntryRepository.delete(existingEntry);
            }
            masterJournalEntryRepository.delete(existing);
            // Flush now: the replacement journal is inserted immediately (identity id) and reuses
            // the same system_entry_no, so the delete must reach the database first
            masterJournalEntryRepository.flush();
        }
    }

    // Mirror of the purchase journal with debit/credit reversed: returning goods
    // reduces what we owe the vendor (debit) and reverses the purchase accounts (credit).
    private void createJournalEntries(MasterPurchaseReturn masterEntry) {
        deleteJournalEntries(masterEntry.getId());

        MasterJournalEntry masterJournalEntry = new MasterJournalEntry();
        masterJournalEntry.setDate(masterEntry.getDate());
        masterJournalEntry.setRemarks(masterEntry.getRemarks());
        masterJournalEntry.setSystemEntryNo(masterEntry.getSystemEntryNo());
        masterJournalEntry.setMasterPurchaseReturn(masterEntry);

        MasterJournalEntry savedJournalEntry = masterJournalEntryRepository.save(masterJournalEntry);

        if (masterEntry.getNonTaxableAmount() > 0) {
            JournalEntry nonTaxableEntry = new JournalEntry();
            AccountMaster accountMaster = accountMasterRepository.findByAccountName("VAT Free Purchase")
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
            nonTaxableEntry.setMasterAccount(accountMaster);
            nonTaxableEntry.setDebitAmount(0.00);
            nonTaxableEntry.setCreditAmount(masterEntry.getNonTaxableAmount());
            nonTaxableEntry.setNarration(masterEntry.getRemarks());
            nonTaxableEntry.setMasterJournalEntryId(savedJournalEntry.getId());
            journalEntryRepository.save(nonTaxableEntry);
        }

        if (masterEntry.getTaxableAmount() > 0) {
            JournalEntry taxableJournalEntry = new JournalEntry();
            AccountMaster accountMaster = accountMasterRepository.findByAccountName("VAT Purchase")
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
            taxableJournalEntry.setMasterAccount(accountMaster);
            taxableJournalEntry.setDebitAmount(0.00);
            taxableJournalEntry.setCreditAmount(masterEntry.getTaxableAmount());
            taxableJournalEntry.setNarration(masterEntry.getRemarks());
            taxableJournalEntry.setMasterJournalEntryId(savedJournalEntry.getId());
            journalEntryRepository.save(taxableJournalEntry);

            JournalEntry taxJournalEntry = new JournalEntry();
            AccountMaster accountMaster2 = accountMasterRepository.findByAccountName("Tax")
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
            taxJournalEntry.setMasterAccount(accountMaster2);
            taxJournalEntry.setDebitAmount(0.00);
            taxJournalEntry.setCreditAmount(masterEntry.getTotalTax());
            taxJournalEntry.setNarration(masterEntry.getRemarks());
            taxJournalEntry.setMasterJournalEntryId(savedJournalEntry.getId());
            journalEntryRepository.save(taxJournalEntry);
        }

        if (masterEntry.getRounding() != 0) {
            JournalEntry roundJournalEntry = new JournalEntry();
            AccountMaster accountMaster = accountMasterRepository.findByAccountName("Adjustment")
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
            roundJournalEntry.setMasterAccount(accountMaster);
            if (masterEntry.getRounding() > 0) {
                roundJournalEntry.setCreditAmount(masterEntry.getRounding());
                roundJournalEntry.setDebitAmount(0.00);
            } else {
                roundJournalEntry.setDebitAmount(-masterEntry.getRounding());
                roundJournalEntry.setCreditAmount(0.00);
            }
            roundJournalEntry.setNarration(masterEntry.getRemarks());
            roundJournalEntry.setMasterJournalEntryId(savedJournalEntry.getId());
            journalEntryRepository.save(roundJournalEntry);
        }

        AccountMaster accountMaster;
        if (masterEntry.getTransactionType().equals("Cash")) {
            accountMaster = accountMasterRepository.findByAccountName("Cash")
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        } else {
            accountMaster = accountMasterRepository.findByVendorId(masterEntry.getVendor().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        }
        JournalEntry journalEntry = new JournalEntry();
        journalEntry.setMasterAccount(accountMaster);
        journalEntry.setDebitAmount(masterEntry.getGrandTotal());
        journalEntry.setCreditAmount(0.00);
        journalEntry.setNarration(masterEntry.getRemarks());
        journalEntry.setMasterJournalEntryId(savedJournalEntry.getId());
        journalEntryRepository.save(journalEntry);
    }
}
