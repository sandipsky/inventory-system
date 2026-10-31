package com.sandipsky.inventory_system.features.settings.document_numbering.services;
import com.sandipsky.inventory_system.features.settings.document_numbering.repositories.DocumentNumberingRepository;
import com.sandipsky.inventory_system.features.settings.document_numbering.dtos.DocumentNumberingDTO;
import com.sandipsky.inventory_system.features.settings.document_numbering.entities.DocumentNumbering;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.features.accounting.journal.entities.MasterJournalEntry;
import com.sandipsky.inventory_system.features.accounting.payment.entities.MasterPayment;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.entities.MasterStockAdjustment;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.MasterPurchaseEntry;
import com.sandipsky.inventory_system.features.purchase.purchase_return.entities.MasterPurchaseReturn;
import com.sandipsky.inventory_system.features.sales.sales_entry.entities.MasterSalesEntry;
import com.sandipsky.inventory_system.features.sales.sales_return.entities.MasterSalesReturn;
import com.sandipsky.inventory_system.features.accounting.journal.repositories.MasterJournalEntryRepository;
import com.sandipsky.inventory_system.features.accounting.payment.repositories.MasterPaymentRepository;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.repositories.MasterStockAdjustmentRepository;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.repositories.MasterPurchaseEntryRepository;
import com.sandipsky.inventory_system.features.purchase.purchase_return.repositories.MasterPurchaseReturnRepository;
import com.sandipsky.inventory_system.features.sales.sales_entry.repositories.MasterSalesEntryRepository;
import com.sandipsky.inventory_system.features.sales.sales_return.repositories.MasterSalesReturnRepository;

@Service
public class DocumentNumberingService {

    @Autowired
    private DocumentNumberingRepository repository;

    @Autowired
    private MasterPurchaseEntryRepository masterPurchaseEntryRepository;

    @Autowired
    private MasterSalesEntryRepository masterSalesEntryRepository;

    @Autowired
    private MasterPurchaseReturnRepository masterPurchaseReturnRepository;

    @Autowired
    private MasterSalesReturnRepository masterSalesReturnRepository;

    @Autowired
    private MasterPaymentRepository masterPaymentRepository;

    @Autowired
    private MasterStockAdjustmentRepository masterStockAdjustmentRepository;

    @Autowired
    private MasterJournalEntryRepository masterJournalEntryRepository;

    public List<DocumentNumberingDTO> getDocumentNumberings() {
        return repository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public String generatePurchaseNumber() {
        DocumentNumbering pref = repository.findByName("Purchase Entry")
                .orElseThrow(() -> new RuntimeException("Document numbering not found for Purchase Entry"));

        Optional<MasterPurchaseEntry> lastEntryOpt = masterPurchaseEntryRepository.findTopByOrderByIdDesc();
        return buildNextNumber(pref, lastEntryOpt.map(MasterPurchaseEntry::getSystemEntryNo).orElse(null));
    }

    public String generateSalesNumber() {
        DocumentNumbering pref = repository.findByName("Sales Entry")
                .orElseThrow(() -> new RuntimeException("Document numbering not found for Sales Entry"));

        Optional<MasterSalesEntry> lastEntryOpt = masterSalesEntryRepository.findTopByOrderByIdDesc();
        return buildNextNumber(pref, lastEntryOpt.map(MasterSalesEntry::getSystemEntryNo).orElse(null));
    }

    public String generatePurchaseReturnNumber() {
        DocumentNumbering pref = repository.findByName("Purchase Return")
                .orElseThrow(() -> new RuntimeException("Document numbering not found for Purchase Return"));

        Optional<MasterPurchaseReturn> lastEntryOpt = masterPurchaseReturnRepository.findTopByOrderByIdDesc();
        return buildNextNumber(pref, lastEntryOpt.map(MasterPurchaseReturn::getSystemEntryNo).orElse(null));
    }

    public String generateSalesReturnNumber() {
        DocumentNumbering pref = repository.findByName("Sales Return")
                .orElseThrow(() -> new RuntimeException("Document numbering not found for Sales Return"));

        Optional<MasterSalesReturn> lastEntryOpt = masterSalesReturnRepository.findTopByOrderByIdDesc();
        return buildNextNumber(pref, lastEntryOpt.map(MasterSalesReturn::getSystemEntryNo).orElse(null));
    }

    public String generatePaymentNumber() {
        DocumentNumbering pref = repository.findByName("Payment")
                .orElseThrow(() -> new RuntimeException("Document numbering not found for Payment"));

        Optional<MasterPayment> lastEntryOpt = masterPaymentRepository.findTopByOrderByIdDesc();
        return buildNextNumber(pref, lastEntryOpt.map(MasterPayment::getSystemEntryNo).orElse(null));
    }

    public String generateStockAdjustmentNumber() {
        DocumentNumbering pref = repository.findByName("Stock Adjustment")
                .orElseThrow(() -> new RuntimeException("Document numbering not found for Stock Adjustment"));

        Optional<MasterStockAdjustment> lastEntryOpt = masterStockAdjustmentRepository.findTopByOrderByIdDesc();
        return buildNextNumber(pref, lastEntryOpt.map(MasterStockAdjustment::getSystemEntryNo).orElse(null));
    }

    public String generateJournalNumber() {
        DocumentNumbering pref = repository.findByName("Journal Entry")
                .orElseThrow(() -> new RuntimeException("Document numbering not found for Journal Entry"));

        Optional<MasterJournalEntry> lastEntryOpt = masterJournalEntryRepository.findTopByOrderByIdDescJournal();
        return buildNextNumber(pref, lastEntryOpt.map(MasterJournalEntry::getSystemEntryNo).orElse(null));
    }

    private String buildNextNumber(DocumentNumbering pref, String lastNumber) {
        int nextNumber = pref.getStartNo();

        if (lastNumber != null && pref.getPrefix() != null) {
            String numericPart = lastNumber.replace(pref.getPrefix(), "");
            try {
                nextNumber = Integer.parseInt(numericPart) + 1;
            } catch (NumberFormatException ignored) {
            }
        }

        if (nextNumber > pref.getEndNo()) {
            throw new IllegalStateException("Document number has exceeded the configured end number.");
        }

        String formattedNumber = String.format("%0" + pref.getBodyLength() + "d", nextNumber);
        return (pref.getPrefix() == null ? "" : pref.getPrefix()) + formattedNumber;
    }

    private DocumentNumberingDTO mapToDTO(DocumentNumbering entity) {
        DocumentNumberingDTO dto = new DocumentNumberingDTO();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setPrefix(entity.getPrefix());
        dto.setBodyLength(entity.getBodyLength());
        dto.setStartNo(entity.getStartNo());
        dto.setEndNo(entity.getEndNo());
        return dto;
    }
}
