package com.sandipsky.inventory_system.features.sales.sales_return.services;
import com.sandipsky.inventory_system.features.sales.sales_return.dtos.SalesReturnEntryDTO;
import com.sandipsky.inventory_system.features.sales.sales_return.entities.SalesReturnEntry;
import com.sandipsky.inventory_system.features.sales.sales_return.repositories.SalesReturnEntryRepository;
import com.sandipsky.inventory_system.features.sales.sales_return.repositories.MasterSalesReturnRepository;
import com.sandipsky.inventory_system.features.sales.sales_return.dtos.MasterSalesReturnDTO;
import com.sandipsky.inventory_system.features.sales.sales_return.entities.MasterSalesReturn;
import com.sandipsky.inventory_system.features.sales.sales_entry.entities.MasterSalesEntry;
import com.sandipsky.inventory_system.features.sales.sales_entry.repositories.MasterSalesEntryRepository;
import com.sandipsky.inventory_system.features.settings.document_numbering.services.DocumentNumberingService;
import com.sandipsky.inventory_system.features.notification.services.NotificationService;
import com.sandipsky.inventory_system.features.notification.services.NotificationType;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import java.util.Map;
import com.sandipsky.inventory_system.features.accounting.account.entities.AccountMaster;
import com.sandipsky.inventory_system.features.accounting.journal.entities.JournalEntry;
import com.sandipsky.inventory_system.features.accounting.journal.entities.MasterJournalEntry;
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
public class SalesReturnService {

    @Autowired
    private MasterSalesReturnRepository repository;

    @Autowired
    private SalesReturnEntryRepository salesReturnEntryRepository;

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
    private MasterSalesEntryRepository salesEntryRepository;

    @Autowired
    private DocumentNumberingService documentNumberService;

    @Autowired
    private NotificationService notificationService;

    private final SpecificationBuilder<MasterSalesReturn> specBuilder = new SpecificationBuilder<>();

    public Page<MasterSalesReturnDTO> getPaginatedMasterSalesReturnsList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<MasterSalesReturn> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        Page<MasterSalesReturn> returnPage = repository.findAll(spec, pageable);
        return returnPage.map(this::mapToDTO);
    }

    public MasterSalesReturnDTO getMasterSalesReturnById(int id) {
        MasterSalesReturn masterSalesReturn = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Return with Given Id not found"));
        MasterSalesReturnDTO dto = mapToDTO(masterSalesReturn);

        if (masterSalesReturn.getSalesReturnEntries() != null) {
            dto.setSalesReturnEntries(
                    masterSalesReturn.getSalesReturnEntries().stream()
                            .map(item -> {
                                SalesReturnEntryDTO itemDto = new SalesReturnEntryDTO();
                                itemDto.setId(item.getId());
                                itemDto.setQuantity(item.getQuantity());
                                itemDto.setCostPrice(item.getCostPrice());
                                itemDto.setSellingPrice(item.getSellingPrice());
                                itemDto.setMrp(item.getMrp());
                                itemDto.setMasterSalesReturnId(item.getMasterSalesReturnId());
                                itemDto.setProductId(item.getProduct().getId());
                                itemDto.setProductName(item.getProduct().getName());
                                if (item.getBatch() != null) {
                                    itemDto.setBatchId(productStockService.batchId(item.getBatch()));
                                    itemDto.setBatchNo(item.getBatch().getBatchNo());
                                    itemDto.setExpiryDate(item.getBatch().getExpiryDate());
                                }
                                return itemDto;
                            }).toList());
        }
        return dto;
    }

    @Transactional
    public MasterSalesReturn saveMasterSalesReturn(MasterSalesReturnDTO dto) {
        LineItemUtil.validateLines(dto.getSalesReturnEntries(), SalesReturnEntryDTO::getQuantity);
        List<SalesReturnEntryDTO> lines = dto.getSalesReturnEntries();
        rejectDuplicateBatches(lines);

        MasterSalesReturn masterSalesReturn = new MasterSalesReturn();
        masterSalesReturn.setSystemEntryNo(documentNumberService.generateSalesReturnNumber());
        mapDtoToEntity(dto, masterSalesReturn);

        MasterSalesReturn savedEntry = repository.save(masterSalesReturn);

        for (SalesReturnEntryDTO item : lines) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

            SalesReturnEntry returnEntry = new SalesReturnEntry();
            returnEntry.setQuantity(item.getQuantity());
            returnEntry.setCostPrice(item.getCostPrice());
            returnEntry.setSellingPrice(item.getSellingPrice());
            returnEntry.setMrp(item.getMrp());
            returnEntry.setMasterSalesReturnId(savedEntry.getId());
            returnEntry.setProduct(product);

            // Goods coming back from the customer go into the named batch (a new one if unknown)
            returnEntry.setBatch(addToBatch(product, item));
            salesReturnEntryRepository.save(returnEntry);
        }

        createJournalEntries(savedEntry);

        notificationService.notifyActivity(NotificationType.SALES_RETURN, NotificationService.INFO,
                "Sales return added", NotificationService.documentMessage(savedEntry.getSystemEntryNo(),
                        "from " + savedEntry.getCustomer().getName(), savedEntry.getGrandTotal()));

        return savedEntry;
    }

    @Transactional
    public void cancelMasterSalesReturn(int id, MasterSalesReturnDTO dto) {
        MasterSalesReturn masterSalesReturn = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Return with Given Id not found"));

        if (masterSalesReturn.isCancelled()) {
            throw new BadRequestException("Sales Return Already Cancelled");
        }

        // The goods did not come back after all: take them out of stock again. The lines stay so
        // the cancelled return still shows what it listed.
        for (SalesReturnEntry item : masterSalesReturn.getSalesReturnEntries()) {
            removeFromStock(productStockService.lineBatch(item.getBatch(), item.getProduct()), item.getQuantity());
        }

        deleteJournalEntries(id);

        masterSalesReturn.setCancelled(true);
        masterSalesReturn.setCancelRemarks(dto.getCancelRemarks());
        repository.save(masterSalesReturn);

        notificationService.notifyActivity(NotificationType.SALES_RETURN, NotificationService.WARN,
                "Sales return cancelled", NotificationService.documentMessage(masterSalesReturn.getSystemEntryNo(),
                        "from " + masterSalesReturn.getCustomer().getName(), masterSalesReturn.getGrandTotal())
                        + reason(masterSalesReturn.getCancelRemarks()));
    }

    private static String reason(String cancelRemarks) {
        return cancelRemarks == null || cancelRemarks.isBlank() ? "" : " Reason: " + cancelRemarks.trim();
    }

    private void rejectDuplicateBatches(List<SalesReturnEntryDTO> lines) {
        LineItemUtil.rejectDuplicateBatches(lines,
                line -> List.of(line.getProductId(), LineItemUtil.batchKey(line.getBatchNo())),
                line -> {
                    String product = productRepository.findById(line.getProductId()).map(Product::getName)
                            .orElse("Product " + line.getProductId());
                    String batch = LineItemUtil.batchKey(line.getBatchNo());
                    return product + (batch.isEmpty() ? " (default batch)" : " batch " + batch);
                });
    }

    // Puts the line's quantity into the batch it names. A batch we never stocked is priced from
    // the return line.
    private ProductStock addToBatch(Product product, SalesReturnEntryDTO item) {
        ProductStock productStock = productStockService.findOrCreateBatch(product, item.getBatchNo(),
                item.getExpiryDate());
        if (productStock.getId() == 0) {
            productStock.setCostPrice(item.getCostPrice());
            productStock.setSellingPrice(item.getSellingPrice());
            productStock.setMrp(item.getMrp());
        }
        productStock.setQuantity(productStock.getQuantity() + item.getQuantity());
        return productStockRepository.save(productStock);
    }

    private void removeFromStock(ProductStock productStock, Double quantity) {
        Double newStock = productStock.getQuantity() - quantity;
        if (newStock < 0) {
            throw new BadRequestException("Product Stock is Already Used");
        }
        productStock.setQuantity(newStock);
        productStockRepository.save(productStock);
    }

    private void mapDtoToEntity(MasterSalesReturnDTO dto, MasterSalesReturn masterSalesReturn) {
        masterSalesReturn.setDate(dto.getDate());
        masterSalesReturn.setTransactionType(dto.getTransactionType());
        masterSalesReturn.setSubTotal(dto.getSubTotal());
        masterSalesReturn.setDiscount(dto.getDiscount());
        masterSalesReturn.setNonTaxableAmount(dto.getNonTaxableAmount());
        masterSalesReturn.setTaxableAmount(dto.getTaxableAmount());
        masterSalesReturn.setTotalTax(dto.getTotalTax());
        masterSalesReturn.setRounded(dto.isRounded());
        masterSalesReturn.setRounding(dto.getRounding());
        masterSalesReturn.setGrandTotal(dto.getGrandTotal());
        masterSalesReturn.setDiscountType(dto.getDiscountType());
        Customer customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        masterSalesReturn.setCustomer(customer);
        masterSalesReturn.setRefSales(refSales(dto.getRefSalesId(), customer));

        if (dto.getRemarks() == null || dto.getRemarks().isEmpty()) {
            masterSalesReturn.setRemarks("Returned Goods from " + customer.getName());
        } else {
            masterSalesReturn.setRemarks(dto.getRemarks());
        }
    }

    // The invoice a return is made against must be the same customer's and still stand
    private MasterSalesEntry refSales(Integer refSalesId, Customer customer) {
        if (refSalesId == null || refSalesId == 0) {
            return null;
        }
        MasterSalesEntry sale = salesEntryRepository.findById(refSalesId)
                .orElseThrow(() -> new ResourceNotFoundException("Reference invoice not found"));
        if (sale.getCustomer() == null || sale.getCustomer().getId() != customer.getId()) {
            throw new BadRequestException("Reference invoice belongs to another customer");
        }
        if (sale.isCancelled()) {
            throw new BadRequestException("Reference invoice is cancelled");
        }
        return sale;
    }

    private MasterSalesReturnDTO mapToDTO(MasterSalesReturn entity) {
        MasterSalesReturnDTO dto = new MasterSalesReturnDTO();
        dto.setId(entity.getId());
        dto.setDate(entity.getDate());
        dto.setSystemEntryNo(entity.getSystemEntryNo());
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
        dto.setCancelled(entity.isCancelled());
        dto.setCancelRemarks(entity.getCancelRemarks());
        if (entity.getRefSales() != null) {
            dto.setRefSalesId(entity.getRefSales().getId());
            dto.setRefSalesNo(entity.getRefSales().getSystemEntryNo());
        }
        if (entity.getCustomer() != null) {
            dto.setCustomerId(entity.getCustomer().getId());
            dto.setCustomerName(entity.getCustomer().getName());
        }
        return dto;
    }

    private void deleteJournalEntries(int masterSalesReturnId) {
        MasterJournalEntry existing = masterJournalEntryRepository
                .findByMasterSalesReturnId(masterSalesReturnId).orElse(null);
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

    // Reverse of the sales journal: returned goods reduce income (debit the sales
    // accounts) and reduce what the customer owes us / cash (credit).
    private void createJournalEntries(MasterSalesReturn masterEntry) {
        deleteJournalEntries(masterEntry.getId());

        MasterJournalEntry masterJournalEntry = new MasterJournalEntry();
        masterJournalEntry.setDate(masterEntry.getDate());
        masterJournalEntry.setRemarks(masterEntry.getRemarks());
        masterJournalEntry.setSystemEntryNo(masterEntry.getSystemEntryNo());
        masterJournalEntry.setMasterSalesReturn(masterEntry);

        MasterJournalEntry savedJournalEntry = masterJournalEntryRepository.save(masterJournalEntry);

        if (masterEntry.getNonTaxableAmount() > 0) {
            JournalEntry nonTaxableEntry = new JournalEntry();
            AccountMaster accountMaster = accountMasterRepository.findByAccountName("VAT Free Sales")
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
            AccountMaster accountMaster = accountMasterRepository.findByAccountName("VAT Sales")
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
            taxableJournalEntry.setMasterAccount(accountMaster);
            taxableJournalEntry.setCreditAmount(0.00);
            taxableJournalEntry.setDebitAmount(masterEntry.getTaxableAmount());
            taxableJournalEntry.setNarration(masterEntry.getRemarks());
            taxableJournalEntry.setMasterJournalEntryId(savedJournalEntry.getId());
            journalEntryRepository.save(taxableJournalEntry);

            JournalEntry taxJournalEntry = new JournalEntry();
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
        journalEntry.setCreditAmount(masterEntry.getGrandTotal());
        journalEntry.setDebitAmount(0.00);
        journalEntry.setNarration(masterEntry.getRemarks());
        journalEntry.setMasterJournalEntryId(savedJournalEntry.getId());
        journalEntryRepository.save(journalEntry);
    }
}
