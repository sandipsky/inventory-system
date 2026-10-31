package com.sandipsky.inventory_system.features.sales.sales_entry.services;
import com.sandipsky.inventory_system.features.sales.sales_entry.dtos.SalesEntryDTO;
import com.sandipsky.inventory_system.features.sales.sales_entry.entities.SalesEntry;
import com.sandipsky.inventory_system.features.sales.sales_entry.repositories.SalesEntryRepository;
import com.sandipsky.inventory_system.features.sales.sales_entry.repositories.MasterSalesEntryRepository;
import com.sandipsky.inventory_system.features.sales.sales_entry.dtos.MasterSalesEntryDTO;
import com.sandipsky.inventory_system.features.sales.sales_entry.entities.MasterSalesEntry;
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
import com.sandipsky.inventory_system.features.sales.customer.entities.Customer;
import com.sandipsky.inventory_system.features.product.entities.Product;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.accounting.account.repositories.AccountMasterRepository;
import com.sandipsky.inventory_system.features.accounting.journal.repositories.JournalEntryRepository;
import com.sandipsky.inventory_system.features.accounting.journal.repositories.MasterJournalEntryRepository;
import com.sandipsky.inventory_system.features.sales.customer.repositories.CustomerRepository;
import com.sandipsky.inventory_system.features.product.repositories.ProductRepository;
import com.sandipsky.inventory_system.features.product.repositories.ProductStockRepository;
import com.sandipsky.inventory_system.features.product.services.ProductStockService;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import com.sandipsky.inventory_system.common.util.LineItemUtil;

@Service
public class SalesEntryService {

    @Autowired
    private MasterSalesEntryRepository repository;

    @Autowired
    private SalesEntryRepository salesEntryRepository;

    @Autowired
    private CustomerRepository customerRepository;

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

    private final SpecificationBuilder<MasterSalesEntry> specBuilder = new SpecificationBuilder<>();

    public Page<MasterSalesEntryDTO> getPaginatedMasterSalesEntrysList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<MasterSalesEntry> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        Page<MasterSalesEntry> productPage = repository.findAll(spec, pageable);
        return productPage.map(this::mapToDTO);
    }

    public MasterSalesEntryDTO getMasterSalesEntryById(int id) {
        MasterSalesEntry masterSalesEntry = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Entry with Given Id not found"));
        MasterSalesEntryDTO masterSalesEntryDTO = mapToDTO(masterSalesEntry);

        if (masterSalesEntry.getSalesEntries() != null) {
            masterSalesEntryDTO.setSalesEntries(
                    masterSalesEntry.getSalesEntries().stream()
                            .map(salesEntry -> {
                                SalesEntryDTO salesEntryDTO = new SalesEntryDTO();
                                salesEntryDTO.setId(salesEntry.getId());
                                salesEntryDTO.setQuantity(salesEntry.getQuantity());
                                salesEntryDTO.setCostPrice(salesEntry.getCostPrice());
                                salesEntryDTO.setSellingPrice(salesEntry.getSellingPrice());
                                salesEntryDTO.setMrp(salesEntry.getMrp());
                                salesEntryDTO.setMasterSalesEntryId(salesEntry.getMasterSalesEntryId());
                                salesEntryDTO.setProductId(salesEntry.getProduct().getId());
                                salesEntryDTO.setProductName(salesEntry.getProduct().getName());
                                if (salesEntry.getBatch() != null) {
                                    salesEntryDTO.setBatchId(productStockService.batchId(salesEntry.getBatch()));
                                    salesEntryDTO.setBatchNo(salesEntry.getBatch().getBatchNo());
                                }
                                return salesEntryDTO;
                            }).toList());
        }
        return masterSalesEntryDTO;
    }

    @Transactional
    public MasterSalesEntry saveMasterSalesEntry(MasterSalesEntryDTO masterSalesEntryDTO) {
        LineItemUtil.validateLines(masterSalesEntryDTO.getSalesEntries(), SalesEntryDTO::getQuantity);
        List<SalesEntryDTO> lines = masterSalesEntryDTO.getSalesEntries();
        rejectDuplicateBatches(lines);

        MasterSalesEntry masterSalesEntry = new MasterSalesEntry();
        masterSalesEntry.setSystemEntryNo(documentNumberService.generateSalesNumber());
        mapDtoToEntity(masterSalesEntryDTO, masterSalesEntry);

        MasterSalesEntry savedEntry = repository.save(masterSalesEntry);

        for (SalesEntryDTO item : lines) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

            // Goods leave the batch picked on the line (the default batch when none is picked)
            ProductStock batch = productStockService.findBatch(product, item.getBatchId());
            removeFromStock(batch, item.getQuantity());

            // Saving sales Entry
            SalesEntry salesEntry = new SalesEntry();
            salesEntry.setQuantity(item.getQuantity());
            salesEntry.setCostPrice(item.getCostPrice());
            salesEntry.setSellingPrice(item.getSellingPrice());
            salesEntry.setMrp(item.getMrp());
            salesEntry.setMasterSalesEntryId(savedEntry.getId());
            salesEntry.setProduct(product);
            salesEntry.setBatch(batch);
            salesEntryRepository.save(salesEntry);
        }

        // Create Journal Entry
        createJournalEntries(savedEntry);
        maintainDueInvoice(savedEntry);

        return savedEntry;
    }

    @Transactional
    public MasterSalesEntry updateMasterSalesEntry(int id, MasterSalesEntryDTO masterSalesEntryDTO) {
        LineItemUtil.validateLines(masterSalesEntryDTO.getSalesEntries(), SalesEntryDTO::getQuantity);
        List<SalesEntryDTO> lines = masterSalesEntryDTO.getSalesEntries();
        rejectDuplicateBatches(lines);

        MasterSalesEntry masterSalesEntry = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Entry with Given Id not found"));

        if (masterSalesEntry.isCancelled()) {
            throw new BadRequestException("Cancelled Sales Entry cannot be updated");
        }

        mapDtoToEntity(masterSalesEntryDTO, masterSalesEntry);

        MasterSalesEntry savedEntry = repository.save(masterSalesEntry);

        List<SalesEntry> existingEntries = salesEntryRepository.findByMasterSalesEntryId(savedEntry.getId());
        List<Integer> incomingIds = new ArrayList<>();
        for (SalesEntryDTO dto : lines) {
            incomingIds.add(dto.getId());
        }

        for (SalesEntry existing : existingEntries) {
            if (!incomingIds.contains(existing.getId())) {
                // Removed sales line: the goods were not sold after all, put them back
                addToStock(productStockService.lineBatch(existing.getBatch(), existing.getProduct()),
                        existing.getQuantity());
                salesEntryRepository.delete(existing);
            }
        }

        for (SalesEntryDTO item : lines) {
            SalesEntry salesEntry;
            if (item.getId() != 0) {
                salesEntry = salesEntryRepository.findById(item.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Sales Entry not found"));
                // Reverse the previously sold quantity in the batch it was sold from
                addToStock(productStockService.lineBatch(salesEntry.getBatch(), salesEntry.getProduct()),
                        salesEntry.getQuantity());
            } else {
                salesEntry = new SalesEntry();
            }

            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

            // Then sell the new quantity from the batch picked now
            ProductStock batch = productStockService.findBatch(product, item.getBatchId());
            removeFromStock(batch, item.getQuantity());

            salesEntry.setQuantity(item.getQuantity());
            salesEntry.setCostPrice(item.getCostPrice());
            salesEntry.setSellingPrice(item.getSellingPrice());
            salesEntry.setMrp(item.getMrp());
            salesEntry.setMasterSalesEntryId(savedEntry.getId());
            salesEntry.setProduct(product);
            salesEntry.setBatch(batch);
            salesEntryRepository.save(salesEntry);
        }

        // Re-create Journal Entry so the books reflect the updated totals
        createJournalEntries(savedEntry);
        maintainDueInvoice(savedEntry);

        return savedEntry;
    }

    @Transactional
    public void cancelMasterSalesEntry(int id, MasterSalesEntryDTO masterSalesEntryDTO) {
        MasterSalesEntry masterSalesEntry = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Entry with Given Id not found"));

        if (masterSalesEntry.isCancelled() == true) {
            throw new BadRequestException("Sales Entry Already Cancelled");
        }

        for (SalesEntry item : masterSalesEntry.getSalesEntries()) {
            addToStock(productStockService.lineBatch(item.getBatch(), item.getProduct()), item.getQuantity());
            salesEntryRepository.deleteById(item.getId());
        }

        // Cancelled sale never happened as far as the books are concerned
        deleteJournalEntries(id);
        removeDueInvoice(masterSalesEntry.getSystemEntryNo());

        masterSalesEntry.setCancelled(true);
        masterSalesEntry.setCancelRemarks(masterSalesEntryDTO.getCancelRemarks());
        repository.save(masterSalesEntry);
    }

    // Credit sales create a due invoice that payments are later adjusted against
    private void maintainDueInvoice(MasterSalesEntry entry) {
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

    private void rejectDuplicateBatches(List<SalesEntryDTO> lines) {
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

    private void mapDtoToEntity(MasterSalesEntryDTO dto, MasterSalesEntry masterSalesEntry) {
        masterSalesEntry.setDate(dto.getDate());
        masterSalesEntry.setTransactionType(dto.getTransactionType());
        masterSalesEntry.setSubTotal(dto.getSubTotal());
        masterSalesEntry.setDiscount(dto.getDiscount());
        masterSalesEntry.setNonTaxableAmount(dto.getNonTaxableAmount());
        masterSalesEntry.setTaxableAmount(dto.getTaxableAmount());
        masterSalesEntry.setTotalTax(dto.getTotalTax());
        masterSalesEntry.setRounded(dto.isRounded());
        masterSalesEntry.setRounding(dto.getRounding());
        masterSalesEntry.setGrandTotal(dto.getGrandTotal());
        masterSalesEntry.setDiscountType(dto.getDiscountType());

        Customer customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        masterSalesEntry.setCustomer(customer);

        if (dto.getRemarks() == null || dto.getRemarks().isEmpty()) {
            masterSalesEntry.setRemarks("Sold Goods to " + customer.getName());
        } else {
            masterSalesEntry.setRemarks(dto.getRemarks());
        }
    }

    private MasterSalesEntryDTO mapToDTO(MasterSalesEntry entity) {
        MasterSalesEntryDTO masterSalesEntryDTO = new MasterSalesEntryDTO();
        masterSalesEntryDTO.setId(entity.getId());
        masterSalesEntryDTO.setDate(entity.getDate());
        masterSalesEntryDTO.setSystemEntryNo(entity.getSystemEntryNo());
        masterSalesEntryDTO.setTransactionType(entity.getTransactionType());
        masterSalesEntryDTO.setSubTotal(entity.getSubTotal());
        masterSalesEntryDTO.setDiscount(entity.getDiscount());
        masterSalesEntryDTO.setNonTaxableAmount(entity.getNonTaxableAmount());
        masterSalesEntryDTO.setTaxableAmount(entity.getTaxableAmount());
        masterSalesEntryDTO.setTotalTax(entity.getTotalTax());
        masterSalesEntryDTO.setRounded(entity.isRounded());
        masterSalesEntryDTO.setRounding(entity.getRounding());
        masterSalesEntryDTO.setGrandTotal(entity.getGrandTotal());
        masterSalesEntryDTO.setDiscountType(entity.getDiscountType());
        masterSalesEntryDTO.setRemarks(entity.getRemarks());
        masterSalesEntryDTO.setCancelled(entity.isCancelled());
        masterSalesEntryDTO.setCancelRemarks(entity.getCancelRemarks());
        if (entity.getCustomer() != null) {
            masterSalesEntryDTO.setCustomerId(entity.getCustomer().getId());
            masterSalesEntryDTO.setCustomerName(entity.getCustomer().getName());
        }
        return masterSalesEntryDTO;
    }

    private void deleteJournalEntries(int masterSalesEntryId) {
        MasterJournalEntry existing = masterJournalEntryRepository.findByMasterSalesEntryId(masterSalesEntryId)
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

    // Sales are the mirror of purchases in the books: income accounts are credited
    // and the cash / customer account is debited with what they owe us.
    private void createJournalEntries(MasterSalesEntry masterEntry) {
        deleteJournalEntries(masterEntry.getId());

        MasterJournalEntry masterJournalEntry = new MasterJournalEntry();
        masterJournalEntry.setDate(masterEntry.getDate());
        masterJournalEntry.setRemarks(masterEntry.getRemarks());
        masterJournalEntry.setSystemEntryNo(masterEntry.getSystemEntryNo());
        masterJournalEntry.setMasterSalesEntry(masterEntry);

        MasterJournalEntry savedJournalEntry = masterJournalEntryRepository.save(masterJournalEntry);

        if (masterEntry.getNonTaxableAmount() > 0) {
            JournalEntry nonTaxableEntry = new JournalEntry();
            AccountMaster accountMaster = accountMasterRepository.findByAccountName("VAT Free Sales")
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
            AccountMaster accountMaster = accountMasterRepository.findByAccountName("VAT Sales")
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
            accountMaster = accountMasterRepository.findByCustomerId(masterEntry.getCustomer().getId())
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
