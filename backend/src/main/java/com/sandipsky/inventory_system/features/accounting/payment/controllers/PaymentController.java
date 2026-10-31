package com.sandipsky.inventory_system.features.accounting.payment.controllers;
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
