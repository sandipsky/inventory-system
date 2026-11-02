package com.sandipsky.inventory_system.features.purchase.purchase_entry.services;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.dtos.PurchaseEntryDTO;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.PurchaseEntry;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.repositories.PurchaseEntryRepository;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.repositories.MasterPurchaseEntryRepository;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.dtos.MasterPurchaseEntryDTO;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.MasterPurchaseEntry;
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
import com.sandipsky.inventory_system.features.accounting.account.entities.AccountMaster;
import com.sandipsky.inventory_system.features.accounting.journal.entities.JournalEntry;
import com.sandipsky.inventory_system.features.accounting.journal.entities.MasterJournalEntry;
import com.sandipsky.inventory_system.features.accounting.payment.entities.AmountDueInvoice;
import com.sandipsky.inventory_system.features.accounting.payment.repositories.AmountDueInvoiceRepository;
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
public class PurchaseEntryService {

    @Autowired
    private MasterPurchaseEntryRepository repository;

    @Autowired
    private PurchaseEntryRepository purchaseEntryRepository;

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
    private AmountDueInvoiceRepository amountDueInvoiceRepository;

    @Autowired
    private DocumentNumberingService documentNumberService;

    @Autowired
    private NotificationService notificationService;

    private final SpecificationBuilder<MasterPurchaseEntry> specBuilder = new SpecificationBuilder<>();

    public Page<MasterPurchaseEntryDTO> getPaginatedMasterPurchaseEntrysList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<MasterPurchaseEntry> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        Page<MasterPurchaseEntry> productPage = repository.findAll(spec, pageable);
        return productPage.map(this::mapToDTO);
    }

    public MasterPurchaseEntryDTO getMasterPurchaseEntryById(int id) {
        MasterPurchaseEntry masterPurchaseEntry = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Entry with Given Id not found"));
        MasterPurchaseEntryDTO masterPurchaseEntryDTO = new MasterPurchaseEntryDTO();
        masterPurchaseEntryDTO.setId(masterPurchaseEntry.getId());
        masterPurchaseEntryDTO.setDate(masterPurchaseEntry.getDate());
        masterPurchaseEntryDTO.setBillDate(masterPurchaseEntry.getBillDate());
        masterPurchaseEntryDTO.setSystemEntryNo(masterPurchaseEntry.getSystemEntryNo());
        masterPurchaseEntryDTO.setBillNo(masterPurchaseEntry.getBillNo());
        masterPurchaseEntryDTO.setTransactionType(masterPurchaseEntry.getTransactionType());
        masterPurchaseEntryDTO.setSubTotal(masterPurchaseEntry.getSubTotal());
        masterPurchaseEntryDTO.setDiscount(masterPurchaseEntry.getDiscount());
        masterPurchaseEntryDTO.setNonTaxableAmount(masterPurchaseEntry.getNonTaxableAmount());
        masterPurchaseEntryDTO.setTaxableAmount(masterPurchaseEntry.getTaxableAmount());
        masterPurchaseEntryDTO.setTotalTax(masterPurchaseEntry.getTotalTax());
        masterPurchaseEntryDTO.setRounded(masterPurchaseEntry.isRounded());
        masterPurchaseEntryDTO.setRounding(masterPurchaseEntry.getRounding());
        masterPurchaseEntryDTO.setGrandTotal(masterPurchaseEntry.getGrandTotal());
        masterPurchaseEntryDTO.setDiscountType(masterPurchaseEntry.getDiscountType());
        masterPurchaseEntryDTO.setRemarks(masterPurchaseEntry.getRemarks());
        if (masterPurchaseEntry.getVendor() != null) {
            masterPurchaseEntryDTO.setVendorId(masterPurchaseEntry.getVendor().getId());
            masterPurchaseEntryDTO.setVendorName(masterPurchaseEntry.getVendor().getName());
        }

        if (masterPurchaseEntry.getPurchaseEntries() != null) {
            masterPurchaseEntryDTO.setPurchaseEntries(
                    masterPurchaseEntry.getPurchaseEntries().stream()
                            .map(pe -> {
                                PurchaseEntryDTO pedto = new PurchaseEntryDTO();
                                pedto.setId(pe.getId());
                                pedto.setQuantity(pe.getQuantity());
                                pedto.setCostPrice(pe.getCostPrice());
                                pedto.setSellingPrice(pe.getSellingPrice());
                                pedto.setMasterPurchaseEntryId(pe.getMasterPurchaseEntryId());
                                pedto.setMrp(pe.getMrp());
                                pedto.setProductId(pe.getProduct().getId());
                                pedto.setProductName(pe.getProduct().getName());
                                if (pe.getBatch() != null) {
                                    pedto.setBatchId(productStockService.batchId(pe.getBatch()));
                                    pedto.setBatchNo(pe.getBatch().getBatchNo());
                                    pedto.setExpiryDate(pe.getBatch().getExpiryDate());
                                }
                                return pedto;
                            }).toList());
        }
        return masterPurchaseEntryDTO;
    }

    @Transactional
    public MasterPurchaseEntry saveMasterPurchaseEntry(MasterPurchaseEntryDTO masterPurchaseEntryDTO) {
        LineItemUtil.validateLines(masterPurchaseEntryDTO.getPurchaseEntries(), PurchaseEntryDTO::getQuantity);
        List<PurchaseEntryDTO> lines = masterPurchaseEntryDTO.getPurchaseEntries();
        rejectDuplicateBatches(lines);

        MasterPurchaseEntry masterPurchaseEntry = new MasterPurchaseEntry();
        masterPurchaseEntry.setDate(masterPurchaseEntryDTO.getDate());
        masterPurchaseEntry.setBillDate(masterPurchaseEntryDTO.getBillDate());
        masterPurchaseEntry.setSystemEntryNo(documentNumberService.generatePurchaseNumber());
        masterPurchaseEntry.setBillNo(masterPurchaseEntryDTO.getBillNo());
        masterPurchaseEntry.setTransactionType(masterPurchaseEntryDTO.getTransactionType());
        masterPurchaseEntry.setSubTotal(masterPurchaseEntryDTO.getSubTotal());
        masterPurchaseEntry.setDiscount(masterPurchaseEntryDTO.getDiscount());
        masterPurchaseEntry.setNonTaxableAmount(masterPurchaseEntryDTO.getNonTaxableAmount());
        masterPurchaseEntry.setTaxableAmount(masterPurchaseEntryDTO.getTaxableAmount());
        masterPurchaseEntry.setTotalTax(masterPurchaseEntryDTO.getTotalTax());
        masterPurchaseEntry.setRounded(masterPurchaseEntryDTO.isRounded());
        masterPurchaseEntry.setRounding(masterPurchaseEntryDTO.getRounding());
        masterPurchaseEntry.setGrandTotal(masterPurchaseEntryDTO.getGrandTotal());
        masterPurchaseEntry.setDiscountType(masterPurchaseEntryDTO.getDiscountType());
        Vendor vendor = vendorRepository.findById(masterPurchaseEntryDTO.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));
        masterPurchaseEntry.setVendor(vendor);

        if (masterPurchaseEntryDTO.getRemarks() == null || masterPurchaseEntryDTO.getRemarks().isEmpty()) {
            masterPurchaseEntry.setRemarks("Purchased Goods from " + vendor.getName());
        } else {
            masterPurchaseEntry.setRemarks(masterPurchaseEntryDTO.getRemarks());
        }

        MasterPurchaseEntry savedEntry;

        try {
            savedEntry = repository.save(masterPurchaseEntry);
        } catch (Exception ex) {
            if (ex.getMessage() != null && ex.getMessage().contains("unique_party_bill_no")) {
                throw new BadRequestException("Bill Number cannot be repeated for the same Vendor");
            }
            throw ex;
        }

        // Create Journal Entry
        createJournalEntries(savedEntry);
        maintainDueInvoice(savedEntry);

        for (PurchaseEntryDTO item : lines) {
            // Saving purchase Entry
            PurchaseEntry purchaseEntry = new PurchaseEntry();
            purchaseEntry.setQuantity(item.getQuantity());
            purchaseEntry.setCostPrice(item.getCostPrice());
            purchaseEntry.setSellingPrice(item.getSellingPrice());
            purchaseEntry.setMrp(item.getMrp());
            purchaseEntry.setMasterPurchaseEntryId(savedEntry.getId());

            // Updating Product Master
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
            product.setCostPrice(item.getCostPrice());
            product.setSellingPrice(item.getSellingPrice());
            product.setMrp(item.getMrp());
            purchaseEntry.setProduct(product);
            productRepository.save(product);

            // Goods go into the named batch (a new one if unknown), or the default batch
            purchaseEntry.setBatch(addToBatch(product, item, null, 0.0));
            purchaseEntryRepository.save(purchaseEntry);
        }

        notificationService.notifyActivity(NotificationType.PURCHASE_ENTRY, NotificationService.INFO,
                "Purchase entry added", NotificationService.documentMessage(savedEntry.getSystemEntryNo(),
                        "from " + vendor.getName(), savedEntry.getGrandTotal()));

        return savedEntry;
    }

    @Transactional
    public MasterPurchaseEntry updateMasterPurchaseEntry(int id, MasterPurchaseEntryDTO masterPurchaseEntryDTO) {
        LineItemUtil.validateLines(masterPurchaseEntryDTO.getPurchaseEntries(), PurchaseEntryDTO::getQuantity);
        List<PurchaseEntryDTO> lines = masterPurchaseEntryDTO.getPurchaseEntries();
        rejectDuplicateBatches(lines);

        MasterPurchaseEntry masterPurchaseEntry = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Entry with Given Id not found"));
        masterPurchaseEntry.setDate(masterPurchaseEntryDTO.getDate());
        masterPurchaseEntry.setBillDate(masterPurchaseEntryDTO.getBillDate());
        masterPurchaseEntry.setBillNo(masterPurchaseEntryDTO.getBillNo());
        masterPurchaseEntry.setTransactionType(masterPurchaseEntryDTO.getTransactionType());
        masterPurchaseEntry.setSubTotal(masterPurchaseEntryDTO.getSubTotal());
        masterPurchaseEntry.setDiscount(masterPurchaseEntryDTO.getDiscount());
        masterPurchaseEntry.setNonTaxableAmount(masterPurchaseEntryDTO.getNonTaxableAmount());
        masterPurchaseEntry.setTaxableAmount(masterPurchaseEntryDTO.getTaxableAmount());
        masterPurchaseEntry.setTotalTax(masterPurchaseEntryDTO.getTotalTax());
        masterPurchaseEntry.setRounded(masterPurchaseEntryDTO.isRounded());
        masterPurchaseEntry.setRounding(masterPurchaseEntryDTO.getRounding());
        masterPurchaseEntry.setGrandTotal(masterPurchaseEntryDTO.getGrandTotal());
        masterPurchaseEntry.setDiscountType(masterPurchaseEntryDTO.getDiscountType());
        Vendor vendor = vendorRepository.findById(masterPurchaseEntryDTO.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));
        masterPurchaseEntry.setVendor(vendor);

        if (masterPurchaseEntryDTO.getRemarks() == null || masterPurchaseEntryDTO.getRemarks().isEmpty()) {
            masterPurchaseEntry.setRemarks("Purchased Goods from " + vendor.getName());
        } else {
            masterPurchaseEntry.setRemarks(masterPurchaseEntryDTO.getRemarks());
        }

        MasterPurchaseEntry savedEntry;

        try {
            savedEntry = repository.save(masterPurchaseEntry);
        } catch (Exception ex) {
            if (ex.getMessage() != null && ex.getMessage().contains("unique_party_bill_no")) {
                throw new BadRequestException("Bill Number cannot be repeated for the same Vendor");
            }
            throw ex;
        }

        List<PurchaseEntry> existingEntries = purchaseEntryRepository.findByMasterPurchaseEntryId(savedEntry.getId());
        List<Integer> incomingIds = new ArrayList<>();
        for (PurchaseEntryDTO dto : lines) {
            incomingIds.add(dto.getId());
        }

        for (PurchaseEntry existing : existingEntries) {
            boolean found = false;
            for (Integer entryId : incomingIds) {
                if (existing.getId() == entryId) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                removeFromBatch(productStockService.lineBatch(existing.getBatch(), existing.getProduct()),
                        existing.getQuantity());
                purchaseEntryRepository.delete(existing);
            }
        }

        for (PurchaseEntryDTO item : lines) {
            // Saving purchase Entry
            PurchaseEntry purchaseEntry;
            ProductStock previousBatch = null;
            if (item.getId() != 0) {
                purchaseEntry = purchaseEntryRepository.findById(item.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Purchase Entry not found"));
                previousBatch = productStockService.lineBatch(purchaseEntry.getBatch(), purchaseEntry.getProduct());
            } else {
                purchaseEntry = new PurchaseEntry();
            }
            Double tempQuantity = purchaseEntry.getQuantity() != null ? purchaseEntry.getQuantity() : 0.0;
            purchaseEntry.setQuantity(item.getQuantity());
            purchaseEntry.setCostPrice(item.getCostPrice());
            purchaseEntry.setSellingPrice(item.getSellingPrice());
            purchaseEntry.setMrp(item.getMrp());
            purchaseEntry.setMasterPurchaseEntryId(savedEntry.getId());

            // Updating Product Master
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
            product.setCostPrice(item.getCostPrice());
            product.setSellingPrice(item.getSellingPrice());
            product.setMrp(item.getMrp());
            purchaseEntry.setProduct(product);
            productRepository.save(product);

            // Move the line's goods from the batch they were in to the batch it names now
            purchaseEntry.setBatch(addToBatch(product, item, previousBatch, tempQuantity));
            purchaseEntryRepository.save(purchaseEntry);
        }

        // Re-create Journal Entry so the books reflect the updated totals
        createJournalEntries(savedEntry);
        maintainDueInvoice(savedEntry);

        return savedEntry;
    }

    @Transactional
    public void deleteMasterPurchaseEntry(int id) {
        MasterPurchaseEntry masterPurchaseEntry = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Entry with Given Id not found"));
        for (PurchaseEntry item : masterPurchaseEntry.getPurchaseEntries()) {
            removeFromBatch(productStockService.lineBatch(item.getBatch(), item.getProduct()), item.getQuantity());
            purchaseEntryRepository.deleteById(item.getId());
        }
        deleteJournalEntries(id);
        removeDueInvoice(masterPurchaseEntry.getSystemEntryNo());
        repository.deleteById(id);

        notificationService.notifyActivity(NotificationType.PURCHASE_ENTRY, NotificationService.WARN,
                "Purchase entry deleted", NotificationService.documentMessage(masterPurchaseEntry.getSystemEntryNo(),
                        "from " + masterPurchaseEntry.getVendor().getName(), masterPurchaseEntry.getGrandTotal()));
    }

    private void rejectDuplicateBatches(List<PurchaseEntryDTO> lines) {
        LineItemUtil.rejectDuplicateBatches(lines,
                line -> List.of(line.getProductId(), LineItemUtil.batchKey(line.getBatchNo())),
                line -> {
                    String product = productRepository.findById(line.getProductId()).map(Product::getName)
                            .orElse("Product " + line.getProductId());
                    String batch = LineItemUtil.batchKey(line.getBatchNo());
                    return product + (batch.isEmpty() ? " (default batch)" : " batch " + batch);
                });
    }

    // Puts the line's quantity into the batch it names at the line's prices, first taking the
    // previously purchased quantity back out of the batch it was in (the same batch when only the
    // quantity changed, so only the difference is applied)
    private ProductStock addToBatch(Product product, PurchaseEntryDTO item, ProductStock previousBatch,
            Double previousQuantity) {
        ProductStock productStock = productStockService.findOrCreateBatch(product, item.getBatchNo(),
                item.getExpiryDate());
        if (previousBatch != null) {
            if (previousBatch.getId() == productStock.getId()) {
                productStock.setQuantity(productStock.getQuantity() - previousQuantity);
            } else {
                removeFromBatch(previousBatch, previousQuantity);
            }
        }
        Double newStock = productStock.getQuantity() + item.getQuantity();
        if (newStock < 0) {
            throw new BadRequestException("Product Stock is Already Used");
        }
        productStock.setQuantity(newStock);
        productStock.setCostPrice(item.getCostPrice());
        productStock.setSellingPrice(item.getSellingPrice());
        productStock.setMrp(item.getMrp());
        return productStockRepository.save(productStock);
    }

    // Takes a purchase line's quantity back out of its batch; fails once the goods have been sold
    private void removeFromBatch(ProductStock batch, Double quantity) {
        Double newStock = batch.getQuantity() - quantity;
        if (newStock < 0) {
            throw new BadRequestException("Product Stock is Already Used");
        }
        batch.setQuantity(newStock);
        productStockRepository.save(batch);
    }

    // Credit purchases create a due invoice that vendor payments are later adjusted against
    private void maintainDueInvoice(MasterPurchaseEntry entry) {
        AmountDueInvoice dueInvoice = amountDueInvoiceRepository.findByInvoiceNumber(entry.getSystemEntryNo())
                .orElse(null);
        if ("Cash".equals(entry.getTransactionType())) {
            if (dueInvoice != null) {
                if (dueInvoice.getPaidAmount() > 0) {
                    throw new BadRequestException("Payments already recorded against this invoice");
                }
                amountDueInvoiceRepository.delete(dueInvoice);
            }
            return;
        }
        if (dueInvoice == null) {
            dueInvoice = new AmountDueInvoice();
            dueInvoice.setInvoiceNumber(entry.getSystemEntryNo());
        }
        if (dueInvoice.getPaidAmount() > entry.getGrandTotal()) {
            throw new BadRequestException("Invoice total cannot be less than the amount already paid");
        }
        dueInvoice.setTotalInvoiceAmount(entry.getGrandTotal());
        dueInvoice.setDueAmount(entry.getGrandTotal() - dueInvoice.getPaidAmount());
        amountDueInvoiceRepository.save(dueInvoice);
    }

    private void removeDueInvoice(String invoiceNumber) {
        AmountDueInvoice dueInvoice = amountDueInvoiceRepository.findByInvoiceNumber(invoiceNumber).orElse(null);
        if (dueInvoice != null) {
            if (dueInvoice.getPaidAmount() > 0) {
                throw new BadRequestException("Payments already recorded against this invoice");
            }
            amountDueInvoiceRepository.delete(dueInvoice);
        }
    }

    private void deleteJournalEntries(int masterPurchaseEntryId) {
        MasterJournalEntry existing = masterJournalEntryRepository.findByMasterPurchaseEntryId(masterPurchaseEntryId)
                .orElse(null);
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

    private MasterPurchaseEntryDTO mapToDTO(MasterPurchaseEntry entity) {
        MasterPurchaseEntryDTO masterPurchaseEntryDTO = new MasterPurchaseEntryDTO();
        masterPurchaseEntryDTO.setId(entity.getId());
        masterPurchaseEntryDTO.setDate(entity.getDate());
        masterPurchaseEntryDTO.setBillDate(entity.getBillDate());
        masterPurchaseEntryDTO.setSystemEntryNo(entity.getSystemEntryNo());
        masterPurchaseEntryDTO.setBillNo(entity.getBillNo());
        masterPurchaseEntryDTO.setTransactionType(entity.getTransactionType());
        masterPurchaseEntryDTO.setSubTotal(entity.getSubTotal());
        masterPurchaseEntryDTO.setDiscount(entity.getDiscount());
        masterPurchaseEntryDTO.setNonTaxableAmount(entity.getNonTaxableAmount());
        masterPurchaseEntryDTO.setTaxableAmount(entity.getTaxableAmount());
        masterPurchaseEntryDTO.setTotalTax(entity.getTotalTax());
        masterPurchaseEntryDTO.setRounded(entity.isRounded());
        masterPurchaseEntryDTO.setRounding(entity.getRounding());
        masterPurchaseEntryDTO.setGrandTotal(entity.getGrandTotal());
        masterPurchaseEntryDTO.setDiscountType(entity.getDiscountType());
        masterPurchaseEntryDTO.setRemarks(entity.getRemarks());
        if (entity.getVendor() != null) {
            masterPurchaseEntryDTO.setVendorId(entity.getVendor().getId());
            masterPurchaseEntryDTO.setVendorName(entity.getVendor().getName());
        }
        return masterPurchaseEntryDTO;
    }

    private void createJournalEntries(MasterPurchaseEntry masterEntry) {
        deleteJournalEntries(masterEntry.getId());

        MasterJournalEntry masterJournalEntry = new MasterJournalEntry();
        masterJournalEntry.setDate(masterEntry.getDate());
        masterJournalEntry.setRemarks(masterEntry.getRemarks());
        masterJournalEntry.setSystemEntryNo(masterEntry.getSystemEntryNo());
        masterJournalEntry.setMasterPurchaseEntry(masterEntry);

        MasterJournalEntry savedJournalEntry = masterJournalEntryRepository.save(masterJournalEntry);

        if (masterEntry.getNonTaxableAmount() > 0) {
            JournalEntry nonTaxableEntry = new JournalEntry();
            // VAT Free Purchase Account
            AccountMaster accountMaster = accountMasterRepository.findByAccountName("VAT Free Purchase")
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
            nonTaxableEntry.setMasterAccount(accountMaster);
            nonTaxableEntry.setCreditAmount(0.00);
            nonTaxableEntry.setDebitAmount(masterEntry.getNonTaxableAmount());
            nonTaxableEntry.setNarration(masterEntry.getRemarks());
            nonTaxableEntry.setMasterJournalEntryId(savedJournalEntry.getId());
            journalEntryRepository.save(nonTaxableEntry);
        }

        if (masterEntry.getTaxableAmount() > 0) {
            JournalEntry taxableJournalEntry = new JournalEntry();
            // VAT Purchase Account
            AccountMaster accountMaster = accountMasterRepository.findByAccountName("VAT Purchase")
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
            taxableJournalEntry.setMasterAccount(accountMaster);
            taxableJournalEntry.setCreditAmount(0.00);
            taxableJournalEntry.setDebitAmount(masterEntry.getTaxableAmount());
            taxableJournalEntry.setNarration(masterEntry.getRemarks());
            taxableJournalEntry.setMasterJournalEntryId(savedJournalEntry.getId());
            journalEntryRepository.save(taxableJournalEntry);

            JournalEntry taxJournalEntry = new JournalEntry();
            // Tax Account
            AccountMaster accountMaster2 = accountMasterRepository.findByAccountName("Tax")
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
            taxJournalEntry.setMasterAccount(accountMaster2);
            taxJournalEntry.setCreditAmount(0.00);
            taxJournalEntry.setDebitAmount(masterEntry.getTotalTax());
            taxJournalEntry.setNarration(masterEntry.getRemarks());
            taxJournalEntry.setMasterJournalEntryId(savedJournalEntry.getId());
            journalEntryRepository.save(taxJournalEntry);
        }

        if (masterEntry.getRounding() != 0) {
            JournalEntry roundJournalEntry = new JournalEntry();
            // Adjustment Account
            AccountMaster accountMaster = accountMasterRepository.findByAccountName("Adjustment")
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
            roundJournalEntry.setMasterAccount(accountMaster);
            if (masterEntry.getRounding() > 0) {
                roundJournalEntry.setDebitAmount(masterEntry.getRounding());
                roundJournalEntry.setCreditAmount(0.00);
            } else {
                roundJournalEntry.setCreditAmount(-masterEntry.getRounding());
                roundJournalEntry.setDebitAmount(0.00);
            }
            roundJournalEntry.setNarration(masterEntry.getRemarks());
            roundJournalEntry.setMasterJournalEntryId(savedJournalEntry.getId());
            journalEntryRepository.save(roundJournalEntry);
        }

        AccountMaster accountMaster = new AccountMaster();
        JournalEntry journalEntry = new JournalEntry();
        if (masterEntry.getTransactionType().equals("Cash")) {
            // Cash Account
            accountMaster = accountMasterRepository.findByAccountName("Cash")
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        } else {
            accountMaster = accountMasterRepository.findByVendorId(masterEntry.getVendor().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        }
        journalEntry.setMasterAccount(accountMaster);
        journalEntry.setCreditAmount(masterEntry.getGrandTotal());
        journalEntry.setDebitAmount(0.00);
        journalEntry.setNarration(masterEntry.getRemarks());
        journalEntry.setMasterJournalEntryId(savedJournalEntry.getId());
        journalEntryRepository.save(journalEntry);
    }
}
