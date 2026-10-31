package com.sandipsky.inventory_system.features.purchase.purchase_return.controllers;
import com.sandipsky.inventory_system.features.purchase.purchase_return.services.PurchaseReturnService;
import com.sandipsky.inventory_system.features.purchase.purchase_return.dtos.MasterPurchaseReturnDTO;
import com.sandipsky.inventory_system.features.purchase.purchase_return.entities.MasterPurchaseReturn;

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
@RequestMapping("/purchase-return")
public class PurchaseReturnController {

    @Autowired
    private PurchaseReturnService service;

    @Autowired
    private DocumentNumberingService documentNumberingService;

    @GetMapping("/generateNumber")
    @RequiresOperation("CreatePurchaseReturn")
    public String generatePurchaseReturnNumber() {
        return documentNumberingService.generatePurchaseReturnNumber();
    }

    @GetMapping()
    @RequiresOperation("ViewPurchaseReturn")
    public Page<MasterPurchaseReturnDTO> getPaginatedMasterPurchaseReturnsList(@RequestParam Map<String, String> params) {
        return service.getPaginatedMasterPurchaseReturnsList(params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewPurchaseReturn")
    public MasterPurchaseReturnDTO getMasterPurchaseReturn(@PathVariable int id) {
        return service.getMasterPurchaseReturnById(id);
    }

    @PostMapping()
    @RequiresOperation("CreatePurchaseReturn")
    public ResponseEntity<ApiResponse<MasterPurchaseReturn>> createMasterPurchaseReturn(
            @RequestBody MasterPurchaseReturnDTO masterPurchaseReturnDTO) {
        MasterPurchaseReturn res = service.saveMasterPurchaseReturn(masterPurchaseReturnDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Purchase Return Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditPurchaseReturn")
    public ResponseEntity<ApiResponse<MasterPurchaseReturn>> updateMasterPurchaseReturn(@PathVariable int id,
            @RequestBody MasterPurchaseReturnDTO masterPurchaseReturnDTO) {
        MasterPurchaseReturn res = service.updateMasterPurchaseReturn(id, masterPurchaseReturnDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Purchase Return Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeletePurchaseReturn")
    public ResponseEntity<ApiResponse<MasterPurchaseReturn>> deleteMasterPurchaseReturn(@PathVariable int id) {
        service.deleteMasterPurchaseReturn(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "Purchase Return Deleted successfully"));
    }
}
