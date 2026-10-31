package com.sandipsky.inventory_system.features.accounting.payment.controllers;
import com.sandipsky.inventory_system.features.accounting.payment.services.PaymentAdjustmentService;
import com.sandipsky.inventory_system.features.accounting.payment.dtos.MasterPaymentDTO;
import com.sandipsky.inventory_system.features.accounting.payment.dtos.PaymentDetailDTO;
import com.sandipsky.inventory_system.features.accounting.payment.entities.MasterPayment;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
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

    @GetMapping()
    @RequiresOperation("ViewPaymentAdjustment")
    public List<MasterPaymentDTO> getPaymentsWithUnadjustedAmount() {
        return service.getPaymentsWithUnadjustedAmount();
    }

    @PostMapping("/{paymentId}")
    @RequiresOperation("CreatePaymentAdjustment")
    public ResponseEntity<ApiResponse<MasterPayment>> adjustPayment(@PathVariable int paymentId,
            @RequestBody List<PaymentDetailDTO> paymentDetails) {
        MasterPayment res = service.adjustPayment(paymentId, paymentDetails);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Payment Adjusted successfully"));
    }
}
