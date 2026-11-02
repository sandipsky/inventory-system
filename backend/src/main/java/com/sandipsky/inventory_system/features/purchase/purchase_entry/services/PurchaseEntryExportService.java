package com.sandipsky.inventory_system.features.purchase.purchase_entry.services;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.common.export.DocumentParts;
import com.sandipsky.inventory_system.common.export.ExportTable;
import com.sandipsky.inventory_system.common.export.Field;
import com.sandipsky.inventory_system.common.export.Formats;
import com.sandipsky.inventory_system.common.export.InvoiceLine;
import com.sandipsky.inventory_system.common.export.PrintDocument;
import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.dtos.MasterPurchaseEntryDTO;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.MasterPurchaseEntry;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.repositories.MasterPurchaseEntryRepository;
import com.sandipsky.inventory_system.features.purchase.vendor.entities.Vendor;

// Files of purchases: the list as a table, one purchase as an invoice, and every purchase of a
// period printed together
@Service
public class PurchaseEntryExportService {

    @Autowired
    private PurchaseEntryService service;

    @Autowired
    private MasterPurchaseEntryRepository repository;

    private final SpecificationBuilder<MasterPurchaseEntry> specBuilder = new SpecificationBuilder<>();

    // Every purchase the list's filters match, in its sort
    public ExportTable list(Map<String, String> params) {
        List<MasterPurchaseEntryDTO> rows = service
                .getPaginatedMasterPurchaseEntrysList(QueryParamUtil.allRows(params)).getContent();
        return ExportTable.<MasterPurchaseEntryDTO>of("Purchases")
                .period(params.get("fromDate"), params.get("toDate"))
                .text("Purchase Number", row -> Formats.docNo(row.getSystemEntryNo()))
                .date("Posting Date", MasterPurchaseEntryDTO::getDate)
                .text("Vendor Name", MasterPurchaseEntryDTO::getVendorName)
                .text("Bill Number", MasterPurchaseEntryDTO::getBillNo)
                .date("Bill Date", MasterPurchaseEntryDTO::getBillDate)
                .text("Transaction Type", MasterPurchaseEntryDTO::getTransactionType)
                .amount("Gross Amount", MasterPurchaseEntryDTO::getSubTotal).total()
                .amount("Discount", row -> DocumentParts.discountAmount(
                        row.getSubTotal(), row.getTaxableAmount(), row.getNonTaxableAmount())).total()
                .amount("Tax Amount", MasterPurchaseEntryDTO::getTotalTax).total()
                .amount("Net Amount", MasterPurchaseEntryDTO::getGrandTotal).total()
                .build(rows);
    }

    @Transactional(readOnly = true)
    public PrintDocument document(int id) {
        return print(repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Entry with Given Id not found")));
    }

    // The purchases between `fromDate` and `toDate`, oldest first
    @Transactional(readOnly = true)
    public List<PrintDocument> documents(Map<String, String> params) {
        return repository.findAll(specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params)),
                Sort.by("date", "id")).stream().map(this::print).toList();
    }

    private PrintDocument print(MasterPurchaseEntry purchase) {
        Vendor vendor = purchase.getVendor();
        List<InvoiceLine> lines = purchase.getPurchaseEntries().stream()
                .map(line -> InvoiceLine.of(line.getProduct(), line.getBatch(), line.getQuantity(),
                        line.getCostPrice(), line.getMrp(), line.getSellingPrice()))
                .toList();
        return new PrintDocument(
                "Purchase Invoice",
                purchase.getSystemEntryNo(),
                null,
                vendor == null ? List.of() : DocumentParts.party("Vendor", vendor.getName(), vendor.getAddress(),
                        vendor.getContact(), vendor.getRegistrationNumber()),
                DocumentParts.present(
                        Field.text("Purchase No.", Formats.docNo(purchase.getSystemEntryNo())),
                        Field.date("Date", purchase.getDate()),
                        Field.text("Bill No.", purchase.getBillNo()),
                        Field.date("Bill Date", purchase.getBillDate()),
                        Field.text("Transaction Type", purchase.getTransactionType())),
                InvoiceLine.table(lines, true),
                DocumentParts.summary(purchase.getSubTotal(), purchase.getDiscount(), purchase.getDiscountType(),
                        purchase.getNonTaxableAmount(), purchase.getTaxableAmount(), purchase.getTotalTax(),
                        purchase.getRounding(), purchase.getGrandTotal()),
                DocumentParts.present(Field.text("Remarks", purchase.getRemarks())));
    }
}
