package com.sandipsky.inventory_system.features.purchase.purchase_return.services;

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
import com.sandipsky.inventory_system.features.purchase.purchase_return.dtos.MasterPurchaseReturnDTO;
import com.sandipsky.inventory_system.features.purchase.purchase_return.entities.MasterPurchaseReturn;
import com.sandipsky.inventory_system.features.purchase.purchase_return.repositories.MasterPurchaseReturnRepository;
import com.sandipsky.inventory_system.features.purchase.vendor.entities.Vendor;

// Files of purchase returns: the list as a table, one return as a document, and every return of a
// period printed together
@Service
public class PurchaseReturnExportService {

    @Autowired
    private PurchaseReturnService service;

    @Autowired
    private MasterPurchaseReturnRepository repository;

    private final SpecificationBuilder<MasterPurchaseReturn> specBuilder = new SpecificationBuilder<>();

    // Every return the list's filters match, in its sort
    public ExportTable list(Map<String, String> params) {
        List<MasterPurchaseReturnDTO> rows = service
                .getPaginatedMasterPurchaseReturnsList(QueryParamUtil.allRows(params)).getContent();
        return ExportTable.<MasterPurchaseReturnDTO>of("Purchase Returns")
                .period(params.get("fromDate"), params.get("toDate"))
                .text("Return Number", row -> Formats.docNo(row.getSystemEntryNo()))
                .date("Posting Date", MasterPurchaseReturnDTO::getDate)
                .text("Vendor Name", MasterPurchaseReturnDTO::getVendorName)
                .text("Bill Number", MasterPurchaseReturnDTO::getBillNo)
                .text("Ref. Purchase", row -> Formats.docNo(row.getRefPurchaseNo()))
                .text("Transaction Type", MasterPurchaseReturnDTO::getTransactionType)
                .amount("Gross Amount", MasterPurchaseReturnDTO::getSubTotal).total()
                .amount("Discount", row -> DocumentParts.discountAmount(
                        row.getSubTotal(), row.getTaxableAmount(), row.getNonTaxableAmount())).total()
                .amount("Tax Amount", MasterPurchaseReturnDTO::getTotalTax).total()
                .amount("Net Amount", MasterPurchaseReturnDTO::getGrandTotal).total()
                .build(rows);
    }

    @Transactional(readOnly = true)
    public PrintDocument document(int id) {
        return print(repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Return with Given Id not found")));
    }

    // The returns between `fromDate` and `toDate`, oldest first
    @Transactional(readOnly = true)
    public List<PrintDocument> documents(Map<String, String> params) {
        return repository.findAll(specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params)),
                Sort.by("date", "id")).stream().map(this::print).toList();
    }

    private PrintDocument print(MasterPurchaseReturn purchaseReturn) {
        Vendor vendor = purchaseReturn.getVendor();
        List<InvoiceLine> lines = purchaseReturn.getPurchaseReturnEntries().stream()
                .map(line -> InvoiceLine.of(line.getProduct(), line.getBatch(), line.getQuantity(),
                        line.getCostPrice(), line.getMrp(), line.getSellingPrice()))
                .toList();
        return new PrintDocument(
                "Purchase Return",
                purchaseReturn.getSystemEntryNo(),
                null,
                vendor == null ? List.of() : DocumentParts.party("Vendor", vendor.getName(), vendor.getAddress(),
                        vendor.getContact(), vendor.getRegistrationNumber()),
                DocumentParts.present(
                        Field.text("Return No.", Formats.docNo(purchaseReturn.getSystemEntryNo())),
                        Field.date("Date", purchaseReturn.getDate()),
                        Field.text("Ref. Purchase", purchaseReturn.getRefPurchase() == null ? null
                                : Formats.docNo(purchaseReturn.getRefPurchase().getSystemEntryNo())),
                        Field.text("Bill No.", purchaseReturn.getBillNo()),
                        Field.text("Transaction Type", purchaseReturn.getTransactionType())),
                InvoiceLine.table(lines, false),
                DocumentParts.summary(purchaseReturn.getSubTotal(), purchaseReturn.getDiscount(),
                        purchaseReturn.getDiscountType(), purchaseReturn.getNonTaxableAmount(),
                        purchaseReturn.getTaxableAmount(), purchaseReturn.getTotalTax(), purchaseReturn.getRounding(),
                        purchaseReturn.getGrandTotal()),
                DocumentParts.present(Field.text("Remarks", purchaseReturn.getRemarks())));
    }
}
