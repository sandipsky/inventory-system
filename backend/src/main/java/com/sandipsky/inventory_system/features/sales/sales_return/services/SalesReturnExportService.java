package com.sandipsky.inventory_system.features.sales.sales_return.services;

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
import com.sandipsky.inventory_system.features.sales.customer.entities.Customer;
import com.sandipsky.inventory_system.features.sales.sales_return.dtos.MasterSalesReturnDTO;
import com.sandipsky.inventory_system.features.sales.sales_return.entities.MasterSalesReturn;
import com.sandipsky.inventory_system.features.sales.sales_return.repositories.MasterSalesReturnRepository;

// Files of sales returns: the list as a table, one return as a document, and every return of a
// period printed together. Cancelled returns are kept, marked and left out of the totals.
@Service
public class SalesReturnExportService {

    @Autowired
    private SalesReturnService service;

    @Autowired
    private MasterSalesReturnRepository repository;

    private final SpecificationBuilder<MasterSalesReturn> specBuilder = new SpecificationBuilder<>();

    // Every return the list's filters match, in its sort
    public ExportTable list(Map<String, String> params) {
        List<MasterSalesReturnDTO> rows = service
                .getPaginatedMasterSalesReturnsList(QueryParamUtil.allRows(params)).getContent();
        return ExportTable.<MasterSalesReturnDTO>of("Sales Returns")
                .period(params.get("fromDate"), params.get("toDate"))
                .cancelledWhen(MasterSalesReturnDTO::isCancelled)
                .text("Return Number", row -> Formats.docNo(row.getSystemEntryNo()))
                .date("Posting Date", MasterSalesReturnDTO::getDate)
                .text("Customer Name", MasterSalesReturnDTO::getCustomerName)
                .text("Ref. Invoice", row -> Formats.docNo(row.getRefSalesNo()))
                .text("Transaction Type", MasterSalesReturnDTO::getTransactionType)
                .text("Status", row -> row.isCancelled() ? "Cancelled" : "Active")
                .amount("Gross Amount", MasterSalesReturnDTO::getSubTotal).total()
                .amount("Discount", row -> DocumentParts.discountAmount(
                        row.getSubTotal(), row.getTaxableAmount(), row.getNonTaxableAmount())).total()
                .amount("Tax Amount", MasterSalesReturnDTO::getTotalTax).total()
                .amount("Net Amount", MasterSalesReturnDTO::getGrandTotal).total()
                .build(rows);
    }

    @Transactional(readOnly = true)
    public PrintDocument document(int id) {
        return print(repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Return with Given Id not found")));
    }

    // The returns between `fromDate` and `toDate`, oldest first, cancelled ones included and marked
    @Transactional(readOnly = true)
    public List<PrintDocument> documents(Map<String, String> params) {
        return repository.findAll(specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params)),
                Sort.by("date", "id")).stream().map(this::print).toList();
    }

    private PrintDocument print(MasterSalesReturn salesReturn) {
        Customer customer = salesReturn.getCustomer();
        List<InvoiceLine> lines = salesReturn.getSalesReturnEntries().stream()
                .map(line -> InvoiceLine.of(line.getProduct(), line.getBatch(), line.getQuantity(),
                        line.getSellingPrice(), line.getMrp(), line.getSellingPrice()))
                .toList();
        return new PrintDocument(
                "Sales Return",
                salesReturn.getSystemEntryNo(),
                salesReturn.isCancelled() ? "CANCELLED" : null,
                customer == null ? List.of() : DocumentParts.party("Customer", customer.getName(),
                        customer.getAddress(), customer.getContact(), customer.getRegistrationNumber()),
                DocumentParts.present(
                        Field.text("Return No.", Formats.docNo(salesReturn.getSystemEntryNo())),
                        Field.date("Date", salesReturn.getDate()),
                        Field.text("Ref. Invoice", salesReturn.getRefSales() == null ? null
                                : Formats.docNo(salesReturn.getRefSales().getSystemEntryNo())),
                        Field.text("Transaction Type", salesReturn.getTransactionType())),
                InvoiceLine.table(lines, false),
                DocumentParts.summary(salesReturn.getSubTotal(), salesReturn.getDiscount(),
                        salesReturn.getDiscountType(), salesReturn.getNonTaxableAmount(),
                        salesReturn.getTaxableAmount(), salesReturn.getTotalTax(), salesReturn.getRounding(),
                        salesReturn.getGrandTotal()),
                DocumentParts.present(
                        Field.text("Remarks", salesReturn.getRemarks()),
                        Field.text("Cancel Reason",
                                salesReturn.isCancelled() ? salesReturn.getCancelRemarks() : null)));
    }
}
