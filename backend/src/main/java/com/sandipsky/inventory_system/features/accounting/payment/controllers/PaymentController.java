package com.sandipsky.inventory_system.features.accounting.payment.controllers;
import com.sandipsky.inventory_system.features.accounting.payment.services.PaymentExportService;
import com.sandipsky.inventory_system.common.export.ExportService;
import com.sandipsky.inventory_system.features.accounting.payment.services.PaymentService;
import com.sandipsky.inventory_system.features.accounting.payment.dtos.MasterPaymentDTO;
import com.sandipsky.inventory_system.features.accounting.payment.entities.MasterPayment;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import java.util.Map;
import com.sandipsky.inventory_system.features.settings.document_numbering.services.DocumentNumberingService;
import com.sandipsky.inventory_system.common.util.ResponseUtil;

import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/payment")
public class PaymentController {

    @Autowired
    private PaymentService service;

    @Autowired
    private PaymentExportService exportService;

    @Autowired
    private ExportService files;

    @Autowired
    private DocumentNumberingService documentNumberingService;

    @GetMapping("/generateNumber")
    @RequiresOperation("CreatePayment")
    public String generatePaymentNumber() {
        return documentNumberingService.generatePaymentNumber();
    }

    @GetMapping()
    @RequiresOperation({ "ViewVendorPayment", "ViewCustomerPayment" })
    public Page<MasterPaymentDTO> getPaginatedMasterPaymentsList(@RequestParam Map<String, String> params) {
        return service.getPaginatedMasterPaymentsList(params);
    }

    // The payments the list's filters match, as an Excel or PDF file
    @GetMapping("/export/{format}")
    @RequiresOperation({ "ViewVendorPayment", "ViewCustomerPayment" })
    public ResponseEntity<byte[]> exportPayments(@PathVariable String format, @RequestParam Map<String, String> params) {
        return files.table(format, "payments", exportService.list(params), params);
    }

    // Every payment between fromDate and toDate in one PDF; type=Vendor or Customer keeps to one kind
    @GetMapping("/print")
    @RequiresOperation({ "ViewVendorPayment", "ViewCustomerPayment" })
    public ResponseEntity<byte[]> printPayments(@RequestParam Map<String, String> params) {
        return files.documents("payments", exportService.documents(params), "No payments in this period", params);
    }

    // One payment as a PDF voucher or receipt, or its settled invoices as an Excel file
    @GetMapping("/{id}/export/{format}")
    @RequiresOperation({ "ViewVendorPayment", "ViewCustomerPayment" })
    public ResponseEntity<byte[]> exportPayment(@PathVariable int id, @PathVariable String format,
            @RequestParam Map<String, String> params) {
        return files.document(format, exportService.document(id), params);
    }

    @GetMapping("/{id}")
    @RequiresOperation({ "ViewVendorPayment", "ViewCustomerPayment" })
    public MasterPaymentDTO getMasterPayment(@PathVariable int id) {
        return service.getMasterPaymentById(id);
    }

    @PostMapping()
    @RequiresOperation("CreatePayment")
    public ResponseEntity<ApiResponse<MasterPayment>> createMasterPayment(
            @RequestBody MasterPaymentDTO masterPaymentDTO) {
        MasterPayment res = service.saveMasterPayment(masterPaymentDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Payment Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditPayment")
    public ResponseEntity<ApiResponse<MasterPayment>> updateMasterPayment(@PathVariable int id,
            @RequestBody MasterPaymentDTO masterPaymentDTO) {
        MasterPayment res = service.updateMasterPayment(id, masterPaymentDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Payment Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeletePayment")
    public ResponseEntity<ApiResponse<MasterPayment>> deleteMasterPayment(@PathVariable int id) {
        service.deleteMasterPayment(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "Payment Deleted successfully"));
    }
}
