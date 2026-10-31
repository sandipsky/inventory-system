package com.sandipsky.inventory_system.features.purchase.purchase_entry.services;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.dtos.PurchaseEntryDTO;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.PurchaseEntry;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.repositories.PurchaseEntryRepository;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.repositories.MasterPurchaseEntryRepository;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.dtos.MasterPurchaseEntryDTO;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.MasterPurchaseEntry;
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
    private MasterJournalEntryRepository masterJournalEntryRepository;

    @Autowired
    private JournalEntryRepository journalEntryRepository;

    @Autowired
    private AccountMasterRepository accountMasterRepository;

    @Autowired
    private AmountDueInvoiceRepository amountDueInvoiceRepository;

    @Autowired
    private DocumentNumberingService documentNumberService;

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
                                return pedto;
                            }).toList());
        }
        return masterPurchaseEntryDTO;
    }

    @Transactional
    public MasterPurchaseEntry saveMasterPurchaseEntry(MasterPurchaseEntryDTO masterPurchaseEntryDTO) {
        LineItemUtil.validateLines(masterPurchaseEntryDTO.getPurchaseEntries(), PurchaseEntryDTO::getQuantity);

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

        if (masterPurchaseEntryDTO.getPurchaseEntries() != null) {
            for (PurchaseEntryDTO item : masterPurchaseEntryDTO.getPurchaseEntries()) {
                // Saving purchase Entry
                PurchaseEntry purchaseEntry = new PurchaseEntry();
                purchaseEntry.setQuantity(item.getQuantity());
                purchaseEntry.setCostPrice(item.getCostPrice());
                purchaseEntry.setSellingPrice(item.getSellingPrice());
                purchaseEntry.setMrp(item.getMrp());
                purchaseEntry.setMasterPurchaseEntryId(savedEntry.getId());
                purchaseEntryRepository.save(purchaseEntry);

                // Updating Product Master
                Product product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
                product.setCostPrice(item.getCostPrice());
                product.setSellingPrice(item.getSellingPrice());
                product.setMrp(item.getMrp());
                purchaseEntry.setProduct(product);
                productRepository.save(product);

                // Creating Product Stock
                ProductStock productStock = productStockRepository.findByProductId(product.getId());
                if (productStock != null) {
                    // Update existing stock
                    productStock.setQuantity(productStock.getQuantity() + item.getQuantity());
                    productStock.setCostPrice(item.getCostPrice());
                    productStock.setSellingPrice(item.getSellingPrice());
                    productStock.setMrp(item.getMrp());
                } else {
                    // Create new stock
                    productStock = new ProductStock();
                    productStock.setProduct(product);
                    productStock.setQuantity(item.getQuantity());
                    productStock.setCostPrice(item.getCostPrice());
                    productStock.setSellingPrice(item.getSellingPrice());
                    productStock.setMrp(item.getMrp());
                }
                productStockRepository.save(productStock);
            }
        }

        return savedEntry;
    }

    @Transactional
    public MasterPurchaseEntry updateMasterPurchaseEntry(int id, MasterPurchaseEntryDTO masterPurchaseEntryDTO) {
        LineItemUtil.validateLines(masterPurchaseEntryDTO.getPurchaseEntries(), PurchaseEntryDTO::getQuantity);

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
        for (PurchaseEntryDTO dto : masterPurchaseEntryDTO.getPurchaseEntries()) {
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
                ProductStock stock = productStockRepository.findByProductId(existing.getProduct().getId());
                Double newStock = stock.getQuantity() - existing.getQuantity();
                if (newStock >= 0) {
                    stock.setQuantity(newStock);
                } else {
                    throw new BadRequestException("Product Stock is Already Used");
                }
                productStockRepository.save(stock);
                purchaseEntryRepository.delete(existing);
            }
        }

        if (masterPurchaseEntryDTO.getPurchaseEntries() != null) {
            for (PurchaseEntryDTO item : masterPurchaseEntryDTO.getPurchaseEntries()) {
                // Saving purchase Entry
                PurchaseEntry purchaseEntry;
                if (item.getId() != 0) {
                    purchaseEntry = purchaseEntryRepository.findById(item.getId())
                            .orElseThrow(() -> new ResourceNotFoundException("Purchase Entry not found"));
                } else {
                    purchaseEntry = new PurchaseEntry();
                }
                Double tempQuantity = purchaseEntry.getQuantity() != null ? purchaseEntry.getQuantity() : 0.0;
                purchaseEntry.setQuantity(item.getQuantity());
                purchaseEntry.setCostPrice(item.getCostPrice());
                purchaseEntry.setSellingPrice(item.getSellingPrice());
                purchaseEntry.setMrp(item.getMrp());
                purchaseEntry.setMasterPurchaseEntryId(savedEntry.getId());
                purchaseEntryRepository.save(purchaseEntry);

                // Updating Product Master
                Product product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
                product.setCostPrice(item.getCostPrice());
                product.setSellingPrice(item.getSellingPrice());
                product.setMrp(item.getMrp());
                purchaseEntry.setProduct(product);
                productRepository.save(product);

                // Creating Product Stock
                ProductStock productStock = productStockRepository.findByProductId(product.getId());
                if (productStock != null) {
                    // Update existing stock
                    Double newStock = productStock.getQuantity() - tempQuantity + item.getQuantity();
                    if (newStock >= 0) {
                        productStock.setQuantity(newStock);
                    } else {
                        throw new BadRequestException("Product Stock is Already Used");
                    }
                    productStock.setCostPrice(item.getCostPrice());
                    productStock.setSellingPrice(item.getSellingPrice());
                    productStock.setMrp(item.getMrp());
                } else {
                    // Create new stock
                    productStock = new ProductStock();
                    productStock.setProduct(product);
                    productStock.setQuantity(item.getQuantity());
                    productStock.setCostPrice(item.getCostPrice());
                    productStock.setSellingPrice(item.getSellingPrice());
                    productStock.setMrp(item.getMrp());
                }
                productStockRepository.save(productStock);
            }
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
            ProductStock productStock = productStockRepository.findByProductId(item.getProduct().getId());
            Double newStock = productStock.getQuantity() - item.getQuantity();
            if (newStock >= 0) {
                productStock.setQuantity(newStock);
            } else {
                throw new BadRequestException("Product Stock is Already Used");
            }
            productStockRepository.save(productStock);
            purchaseEntryRepository.deleteById(item.getId());
        }
        deleteJournalEntries(id);
        removeDueInvoice(masterPurchaseEntry.getSystemEntryNo());
        repository.deleteById(id);
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
