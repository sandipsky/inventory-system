package com.sandipsky.inventory_system.features.accounting.payment.controllers;
import com.sandipsky.inventory_system.common.export.ExportService;
import com.sandipsky.inventory_system.features.accounting.payment.services.PaymentExportService;
import com.sandipsky.inventory_system.features.accounting.payment.services.PaymentAdjustmentService;
import com.sandipsky.inventory_system.features.accounting.payment.dtos.MasterPaymentDTO;
import com.sandipsky.inventory_system.features.accounting.payment.dtos.PaymentDetailDTO;
import com.sandipsky.inventory_system.features.accounting.payment.entities.MasterPayment;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import com.sandipsky.inventory_system.common.util.ResponseUtil;

import org.springframework.http.ResponseEntity;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/payment-adjustment")
public class PaymentAdjustmentController {

    @Autowired
    private PaymentAdjustmentService service;

    @Autowired
    private PaymentExportService exportService;

    @Autowired
    private ExportService files;

    @GetMapping()
    @RequiresOperation("ViewPaymentAdjustment")
    public Page<MasterPaymentDTO> getPaymentsWithUnadjustedAmount(@RequestParam Map<String, String> params) {
        return service.getPaymentsWithUnadjustedAmount(params);
    }

    // The payments still to adjust that the filters match, as an Excel or PDF file
    @GetMapping("/export/{format}")
    @RequiresOperation("ViewPaymentAdjustment")
    public ResponseEntity<byte[]> exportUnadjustedPayments(@PathVariable String format,
            @RequestParam Map<String, String> params) {
        return files.table(format, "unadjusted-payments", exportService.unadjusted(params), params);
    }

    @PostMapping("/{paymentId}")
    @RequiresOperation("CreatePaymentAdjustment")
    public ResponseEntity<ApiResponse<MasterPayment>> adjustPayment(@PathVariable int paymentId,
            @RequestBody List<PaymentDetailDTO> paymentDetails) {
        MasterPayment res = service.adjustPayment(paymentId, paymentDetails);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Payment Adjusted successfully"));
    }
}
