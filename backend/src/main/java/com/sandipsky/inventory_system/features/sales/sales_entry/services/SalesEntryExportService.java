package com.sandipsky.inventory_system.features.sales.sales_entry.services;

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
import com.sandipsky.inventory_system.features.sales.sales_entry.dtos.MasterSalesEntryDTO;
import com.sandipsky.inventory_system.features.sales.sales_entry.entities.MasterSalesEntry;
import com.sandipsky.inventory_system.features.sales.sales_entry.repositories.MasterSalesEntryRepository;

// Files of sales: the list as a table, one sale as an invoice, and every sale of a period printed
// together. Cancelled sales are kept, marked and left out of the totals.
@Service
public class SalesEntryExportService {

    @Autowired
    private SalesEntryService service;

    @Autowired
    private MasterSalesEntryRepository repository;

    private final SpecificationBuilder<MasterSalesEntry> specBuilder = new SpecificationBuilder<>();

    // Every sale the list's filters match, in its sort
    public ExportTable list(Map<String, String> params) {
        List<MasterSalesEntryDTO> rows = service
                .getPaginatedMasterSalesEntrysList(QueryParamUtil.allRows(params)).getContent();
        return ExportTable.<MasterSalesEntryDTO>of("Sales")
                .period(params.get("fromDate"), params.get("toDate"))
                .cancelledWhen(MasterSalesEntryDTO::isCancelled)
                .text("Invoice Number", row -> Formats.docNo(row.getSystemEntryNo()))
                .date("Posting Date", MasterSalesEntryDTO::getDate)
                .text("Customer Name", MasterSalesEntryDTO::getCustomerName)
                .text("Transaction Type", MasterSalesEntryDTO::getTransactionType)
                .text("Status", row -> row.isCancelled() ? "Cancelled" : "Active")
                .amount("Gross Amount", MasterSalesEntryDTO::getSubTotal).total()
                .amount("Discount", row -> DocumentParts.discountAmount(
                        row.getSubTotal(), row.getTaxableAmount(), row.getNonTaxableAmount())).total()
                .amount("Tax Amount", MasterSalesEntryDTO::getTotalTax).total()
                .amount("Net Amount", MasterSalesEntryDTO::getGrandTotal).total()
                .build(rows);
    }

    @Transactional(readOnly = true)
    public PrintDocument document(int id) {
        return print(repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Entry with Given Id not found")));
    }

    // The sales between `fromDate` and `toDate`, oldest first, cancelled ones included and marked
    @Transactional(readOnly = true)
    public List<PrintDocument> documents(Map<String, String> params) {
        return repository.findAll(specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params)),
                Sort.by("date", "id")).stream().map(this::print).toList();
    }

    private PrintDocument print(MasterSalesEntry sale) {
        Customer customer = sale.getCustomer();
        List<InvoiceLine> lines = sale.getSalesEntries().stream()
                .map(line -> InvoiceLine.of(line.getProduct(), line.getBatch(), line.getQuantity(),
                        line.getSellingPrice(), line.getMrp(), line.getSellingPrice()))
                .toList();
        return new PrintDocument(
                "Sales Invoice",
                sale.getSystemEntryNo(),
                sale.isCancelled() ? "CANCELLED" : null,
                customer == null ? List.of() : DocumentParts.party("Customer", customer.getName(),
                        customer.getAddress(), customer.getContact(), customer.getRegistrationNumber()),
                DocumentParts.present(
                        Field.text("Invoice No.", Formats.docNo(sale.getSystemEntryNo())),
                        Field.date("Date", sale.getDate()),
                        Field.text("Transaction Type", sale.getTransactionType())),
                InvoiceLine.table(lines, false),
                DocumentParts.summary(sale.getSubTotal(), sale.getDiscount(), sale.getDiscountType(),
                        sale.getNonTaxableAmount(), sale.getTaxableAmount(), sale.getTotalTax(), sale.getRounding(),
                        sale.getGrandTotal()),
                DocumentParts.present(
                        Field.text("Remarks", sale.getRemarks()),
                        Field.text("Cancel Reason", sale.isCancelled() ? sale.getCancelRemarks() : null)));
    }
}
