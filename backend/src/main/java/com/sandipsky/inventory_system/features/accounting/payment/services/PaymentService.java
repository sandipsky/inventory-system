package com.sandipsky.inventory_system.features.accounting.payment.services;
import com.sandipsky.inventory_system.features.accounting.payment.dtos.PaymentDetailDTO;
import com.sandipsky.inventory_system.features.accounting.payment.dtos.MasterPaymentDTO;
import com.sandipsky.inventory_system.features.accounting.payment.entities.AmountDueInvoice;
import com.sandipsky.inventory_system.features.accounting.payment.entities.MasterPayment;
import com.sandipsky.inventory_system.features.accounting.payment.entities.PaymentDetail;
import com.sandipsky.inventory_system.features.accounting.payment.repositories.AmountDueInvoiceRepository;
import com.sandipsky.inventory_system.features.accounting.payment.repositories.MasterPaymentRepository;
import com.sandipsky.inventory_system.features.accounting.payment.repositories.PaymentDetailRepository;
import com.sandipsky.inventory_system.features.settings.document_numbering.services.DocumentNumberingService;

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
import com.sandipsky.inventory_system.features.sales.customer.entities.Customer;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.accounting.account.repositories.AccountMasterRepository;
import com.sandipsky.inventory_system.features.accounting.journal.repositories.JournalEntryRepository;
import com.sandipsky.inventory_system.features.accounting.journal.repositories.MasterJournalEntryRepository;
import com.sandipsky.inventory_system.features.purchase.vendor.repositories.VendorRepository;
import com.sandipsky.inventory_system.features.sales.customer.repositories.CustomerRepository;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;

@Service
public class PaymentService {

    @Autowired
    private MasterPaymentRepository repository;

    @Autowired
    private PaymentDetailRepository paymentDetailRepository;

    @Autowired
    private AmountDueInvoiceRepository amountDueInvoiceRepository;

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private MasterJournalEntryRepository masterJournalEntryRepository;

    @Autowired
    private JournalEntryRepository journalEntryRepository;

    @Autowired
    private AccountMasterRepository accountMasterRepository;

    @Autowired
    private DocumentNumberingService documentNumberService;

    private final SpecificationBuilder<MasterPayment> specBuilder = new SpecificationBuilder<>();

    public Page<MasterPaymentDTO> getPaginatedMasterPaymentsList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<MasterPayment> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        Page<MasterPayment> paymentPage = repository.findAll(spec, pageable);
        return paymentPage.map(this::mapToDTO);
    }

    public MasterPaymentDTO getMasterPaymentById(int id) {
        MasterPayment masterPayment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment with Given Id not found"));
        MasterPaymentDTO dto = mapToDTO(masterPayment);

        if (masterPayment.getPaymentDetails() != null) {
            dto.setPaymentDetails(
                    masterPayment.getPaymentDetails().stream()
                            .map(this::mapDetailToDTO).toList());
        }
        return dto;
    }

    @Transactional
    public MasterPayment saveMasterPayment(MasterPaymentDTO dto) {
        MasterPayment masterPayment = new MasterPayment();
        masterPayment.setSystemEntryNo(documentNumberService.generatePaymentNumber());
        mapDtoToEntity(dto, masterPayment);

        double adjusted = applyDetails(dto.getPaymentDetails(), masterPayment, 0);
        if (adjusted > dto.getAmount()) {
            throw new BadRequestException("Adjusted amount cannot exceed the payment amount");
        }
        masterPayment.setTotalAdjustedPaidAmount(adjusted);
        masterPayment.setUnadjustedAmount(dto.getAmount() - adjusted);
        masterPayment.setTotalPaymentAmount(dto.getAmount());

        MasterPayment savedEntry = repository.save(masterPayment);

        saveDetails(dto.getPaymentDetails(), savedEntry.getId());
        createJournalEntries(savedEntry);

        return savedEntry;
    }

    @Transactional
    public MasterPayment updateMasterPayment(int id, MasterPaymentDTO dto) {
        MasterPayment masterPayment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment with Given Id not found"));

        // Reverse the previous invoice allocations before re-applying
        List<PaymentDetail> existingDetails = paymentDetailRepository.findByMasterPaymentId(masterPayment.getId());
        for (PaymentDetail existing : existingDetails) {
            reverseDueInvoice(existing.getInvoiceNumber(), existing.getPaidAmount());
            paymentDetailRepository.delete(existing);
        }

        mapDtoToEntity(dto, masterPayment);

        double adjusted = applyDetails(dto.getPaymentDetails(), masterPayment, 0);
        if (adjusted > dto.getAmount()) {
            throw new BadRequestException("Adjusted amount cannot exceed the payment amount");
        }
        masterPayment.setTotalAdjustedPaidAmount(adjusted);
        masterPayment.setUnadjustedAmount(dto.getAmount() - adjusted);
        masterPayment.setTotalPaymentAmount(dto.getAmount());

        MasterPayment savedEntry = repository.save(masterPayment);

        saveDetails(dto.getPaymentDetails(), savedEntry.getId());
        createJournalEntries(savedEntry);

        return savedEntry;
    }

    @Transactional
    public void deleteMasterPayment(int id) {
        MasterPayment masterPayment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment with Given Id not found"));

        for (PaymentDetail detail : paymentDetailRepository.findByMasterPaymentId(masterPayment.getId())) {
            reverseDueInvoice(detail.getInvoiceNumber(), detail.getPaidAmount());
            paymentDetailRepository.delete(detail);
        }

        deleteJournalEntries(id);
        repository.deleteById(id);
    }

    // Applies each allocation to its due invoice and returns the total adjusted amount.
    private double applyDetails(List<PaymentDetailDTO> details, MasterPayment masterPayment, double startingTotal) {
        double adjusted = startingTotal;
        if (details == null) {
            return adjusted;
        }
        for (PaymentDetailDTO item : details) {
            if (item.getPaidAmount() <= 0) {
                throw new BadRequestException("Paid amount for an invoice must be greater than zero");
            }
            applyDueInvoice(item.getInvoiceNumber(), item.getPaidAmount());
            adjusted += item.getPaidAmount();
        }
        return adjusted;
    }

    private void saveDetails(List<PaymentDetailDTO> details, int masterPaymentId) {
        if (details == null) {
            return;
        }
        for (PaymentDetailDTO item : details) {
            PaymentDetail detail = new PaymentDetail();
            detail.setMasterPaymentId(masterPaymentId);
            detail.setInvoiceDate(item.getInvoiceDate());
            detail.setInvoiceNumber(item.getInvoiceNumber());
            detail.setTotalInvoiceAmount(item.getTotalInvoiceAmount());
            detail.setPaidAmount(item.getPaidAmount());
            AmountDueInvoice dueInvoice = amountDueInvoiceRepository.findByInvoiceNumber(item.getInvoiceNumber())
                    .orElse(null);
            detail.setDueAmount(dueInvoice != null ? dueInvoice.getDueAmount() : item.getDueAmount());
            paymentDetailRepository.save(detail);
        }
    }

    private void applyDueInvoice(String invoiceNumber, double paidAmount) {
        AmountDueInvoice dueInvoice = amountDueInvoiceRepository.findByInvoiceNumber(invoiceNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Due Invoice not found: " + invoiceNumber));
        if (dueInvoice.getDueAmount() < paidAmount) {
            throw new BadRequestException("Paid amount exceeds due amount for invoice " + invoiceNumber);
        }
        dueInvoice.setPaidAmount(dueInvoice.getPaidAmount() + paidAmount);
        dueInvoice.setDueAmount(dueInvoice.getDueAmount() - paidAmount);
        amountDueInvoiceRepository.save(dueInvoice);
    }

    private void reverseDueInvoice(String invoiceNumber, double paidAmount) {
        AmountDueInvoice dueInvoice = amountDueInvoiceRepository.findByInvoiceNumber(invoiceNumber).orElse(null);
        if (dueInvoice == null) {
            return;
        }
        dueInvoice.setPaidAmount(dueInvoice.getPaidAmount() - paidAmount);
        dueInvoice.setDueAmount(dueInvoice.getDueAmount() + paidAmount);
        amountDueInvoiceRepository.save(dueInvoice);
    }

    private void mapDtoToEntity(MasterPaymentDTO dto, MasterPayment masterPayment) {
        if (!"Vendor".equals(dto.getType()) && !"Customer".equals(dto.getType())) {
            throw new BadRequestException("Payment type must be either Vendor or Customer");
        }
        masterPayment.setDate(dto.getDate());
        masterPayment.setType(dto.getType());
        masterPayment.setAmount(dto.getAmount());

        AccountMaster paymentMode = accountMasterRepository.findById(dto.getPaymentModeId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment Mode Account not found"));
        masterPayment.setPaymentMode(paymentMode);

        if ("Vendor".equals(dto.getType())) {
            Vendor vendor = vendorRepository.findById(dto.getVendorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));
            masterPayment.setVendor(vendor);
            masterPayment.setCustomer(null);
            if (dto.getNarration() == null || dto.getNarration().isEmpty()) {
                masterPayment.setNarration("Payment made to " + vendor.getName());
            } else {
                masterPayment.setNarration(dto.getNarration());
            }
        } else {
            Customer customer = customerRepository.findById(dto.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
            masterPayment.setCustomer(customer);
            masterPayment.setVendor(null);
            if (dto.getNarration() == null || dto.getNarration().isEmpty()) {
                masterPayment.setNarration("Payment received from " + customer.getName());
            } else {
                masterPayment.setNarration(dto.getNarration());
            }
        }
    }

    private MasterPaymentDTO mapToDTO(MasterPayment entity) {
        MasterPaymentDTO dto = new MasterPaymentDTO();
        dto.setId(entity.getId());
        dto.setDate(entity.getDate());
        dto.setSystemEntryNo(entity.getSystemEntryNo());
        dto.setType(entity.getType());
        dto.setAmount(entity.getAmount());
        dto.setNarration(entity.getNarration());
        dto.setTotalAdjustedPaidAmount(entity.getTotalAdjustedPaidAmount());
        dto.setUnadjustedAmount(entity.getUnadjustedAmount());
        dto.setTotalPaymentAmount(entity.getTotalPaymentAmount());
        if (entity.getPaymentMode() != null) {
            dto.setPaymentModeId(entity.getPaymentMode().getId());
            dto.setPaymentModeName(entity.getPaymentMode().getAccountName());
        }
        if (entity.getVendor() != null) {
            dto.setVendorId(entity.getVendor().getId());
            dto.setVendorName(entity.getVendor().getName());
        }
        if (entity.getCustomer() != null) {
            dto.setCustomerId(entity.getCustomer().getId());
            dto.setCustomerName(entity.getCustomer().getName());
        }
        return dto;
    }

    private PaymentDetailDTO mapDetailToDTO(PaymentDetail detail) {
        PaymentDetailDTO detailDTO = new PaymentDetailDTO();
        detailDTO.setId(detail.getId());
        detailDTO.setMasterPaymentId(detail.getMasterPaymentId());
        detailDTO.setInvoiceDate(detail.getInvoiceDate());
        detailDTO.setInvoiceNumber(detail.getInvoiceNumber());
        detailDTO.setTotalInvoiceAmount(detail.getTotalInvoiceAmount());
        detailDTO.setDueAmount(detail.getDueAmount());
        detailDTO.setPaidAmount(detail.getPaidAmount());
        return detailDTO;
    }

    private void deleteJournalEntries(int masterPaymentId) {
        MasterJournalEntry existing = masterJournalEntryRepository.findByMasterPaymentId(masterPaymentId)
                .orElse(null);
        if (existing != null) {
            for (JournalEntry existingEntry : existing.getJournalEntries()) {
                journalEntryRepository.delete(existingEntry);
            }
            masterJournalEntryRepository.delete(existing);
        }
    }

    // Vendor payment settles what we owe: debit the vendor account, credit the
    // payment mode (Cash/Bank). Customer receipt is the mirror image.
    private void createJournalEntries(MasterPayment masterEntry) {
        deleteJournalEntries(masterEntry.getId());

        MasterJournalEntry masterJournalEntry = new MasterJournalEntry();
        masterJournalEntry.setDate(masterEntry.getDate());
        masterJournalEntry.setRemarks(masterEntry.getNarration());
        masterJournalEntry.setSystemEntryNo(masterEntry.getSystemEntryNo());
        masterJournalEntry.setMasterPayment(masterEntry);

        MasterJournalEntry savedJournalEntry = masterJournalEntryRepository.save(masterJournalEntry);

        AccountMaster partyAccount;
        if ("Vendor".equals(masterEntry.getType())) {
            partyAccount = accountMasterRepository.findByVendorId(masterEntry.getVendor().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        } else {
            partyAccount = accountMasterRepository.findByCustomerId(masterEntry.getCustomer().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        }

        JournalEntry partyEntry = new JournalEntry();
        partyEntry.setMasterAccount(partyAccount);
        JournalEntry modeEntry = new JournalEntry();
        modeEntry.setMasterAccount(masterEntry.getPaymentMode());

        if ("Vendor".equals(masterEntry.getType())) {
            partyEntry.setDebitAmount(masterEntry.getAmount());
            partyEntry.setCreditAmount(0.00);
            modeEntry.setDebitAmount(0.00);
            modeEntry.setCreditAmount(masterEntry.getAmount());
        } else {
            partyEntry.setDebitAmount(0.00);
            partyEntry.setCreditAmount(masterEntry.getAmount());
            modeEntry.setDebitAmount(masterEntry.getAmount());
            modeEntry.setCreditAmount(0.00);
        }

        partyEntry.setNarration(masterEntry.getNarration());
        partyEntry.setMasterJournalEntryId(savedJournalEntry.getId());
        journalEntryRepository.save(partyEntry);

        modeEntry.setNarration(masterEntry.getNarration());
        modeEntry.setMasterJournalEntryId(savedJournalEntry.getId());
        journalEntryRepository.save(modeEntry);
    }
}
