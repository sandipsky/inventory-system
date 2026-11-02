package com.sandipsky.inventory_system.features.accounting.payment.services;

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
import com.sandipsky.inventory_system.common.export.PrintDocument;
import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;
import com.sandipsky.inventory_system.features.accounting.payment.dtos.MasterPaymentDTO;
import com.sandipsky.inventory_system.features.accounting.payment.entities.MasterPayment;
import com.sandipsky.inventory_system.features.accounting.payment.entities.PaymentDetail;
import com.sandipsky.inventory_system.features.accounting.payment.repositories.MasterPaymentRepository;
import com.sandipsky.inventory_system.features.purchase.vendor.entities.Vendor;
import com.sandipsky.inventory_system.features.sales.customer.entities.Customer;

// Files of payments: the list and the payments still to adjust as tables, one payment as a voucher
// (sent to a vendor) or receipt (from a customer), and every payment of a period printed together
@Service
public class PaymentExportService {

    @Autowired
    private PaymentService service;

    @Autowired
    private PaymentAdjustmentService adjustmentService;

    @Autowired
    private MasterPaymentRepository repository;

    private final SpecificationBuilder<MasterPayment> specBuilder = new SpecificationBuilder<>();

    // Every payment the list's filters match, in its sort
    public ExportTable list(Map<String, String> params) {
        List<MasterPaymentDTO> rows = service
                .getPaginatedMasterPaymentsList(QueryParamUtil.allRows(params)).getContent();
        return columns(ExportTable.<MasterPaymentDTO>of("Payments"), params)
                .text("Narration", MasterPaymentDTO::getNarration)
                .build(rows);
    }

    // Every payment with an unadjusted amount the filters match, in their sort
    public ExportTable unadjusted(Map<String, String> params) {
        List<MasterPaymentDTO> rows = adjustmentService
                .getPaymentsWithUnadjustedAmount(QueryParamUtil.allRows(params)).getContent();
        return columns(ExportTable.<MasterPaymentDTO>of("Unadjusted Payments"), params).build(rows);
    }

    private static ExportTable.Builder<MasterPaymentDTO> columns(ExportTable.Builder<MasterPaymentDTO> table,
            Map<String, String> params) {
        return table
                .period(params.get("fromDate"), params.get("toDate"))
                .text("Payment Number", row -> Formats.docNo(row.getSystemEntryNo()))
                .date("Date", MasterPaymentDTO::getDate)
                .text("Party Type", MasterPaymentDTO::getType)
                .text("Party Name", row -> "Vendor".equals(row.getType()) ? row.getVendorName() : row.getCustomerName())
                .text("Payment Mode", MasterPaymentDTO::getPaymentModeName)
                .amount("Amount", MasterPaymentDTO::getAmount).total()
                .amount("Settled", MasterPaymentDTO::getTotalAdjustedPaidAmount).total()
                .amount("Unadjusted", MasterPaymentDTO::getUnadjustedAmount).total();
    }

    @Transactional(readOnly = true)
    public PrintDocument document(int id) {
        return print(repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment with Given Id not found")));
    }

    // The payments between `fromDate` and `toDate`, oldest first; `type` keeps to vendors or customers
    @Transactional(readOnly = true)
    public List<PrintDocument> documents(Map<String, String> params) {
        return repository.findAll(specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params)),
                Sort.by("date", "id")).stream().map(this::print).toList();
    }

    private PrintDocument print(MasterPayment payment) {
        boolean toVendor = "Vendor".equals(payment.getType());
        Vendor vendor = payment.getVendor();
        Customer customer = payment.getCustomer();
        List<Field> party = List.of();
        if (toVendor && vendor != null) {
            party = DocumentParts.party("Vendor", vendor.getName(), vendor.getAddress(), vendor.getContact(),
                    vendor.getRegistrationNumber());
        } else if (!toVendor && customer != null) {
            party = DocumentParts.party("Customer", customer.getName(), customer.getAddress(),
                    customer.getContact(), customer.getRegistrationNumber());
        }
        ExportTable settlements = ExportTable.<PaymentDetail>of("Settled Invoices")
                .date("Invoice Date", PaymentDetail::getInvoiceDate)
                .text("Invoice Number", detail -> Formats.docNo(detail.getInvoiceNumber()))
                .amount("Invoice Amount", PaymentDetail::getTotalInvoiceAmount)
                .amount("Paid", PaymentDetail::getPaidAmount).total()
                .build(payment.getPaymentDetails() == null ? List.of() : payment.getPaymentDetails());
        return new PrintDocument(
                toVendor ? "Payment Voucher" : "Payment Receipt",
                payment.getSystemEntryNo(),
                null,
                party,
                DocumentParts.present(
                        Field.text("Payment No.", Formats.docNo(payment.getSystemEntryNo())),
                        Field.date("Date", payment.getDate()),
                        Field.text("Payment Type", toVendor ? "Send" : "Receive"),
                        Field.text("Payment Mode",
                                payment.getPaymentMode() == null ? null : payment.getPaymentMode().getAccountName())),
                settlements,
                List.of(
                        Field.amount("Settled", payment.getTotalAdjustedPaidAmount()),
                        Field.amount("Unadjusted", payment.getUnadjustedAmount()),
                        Field.amount("Amount", payment.getAmount())),
                DocumentParts.present(Field.text("Narration", payment.getNarration())));
    }
}
