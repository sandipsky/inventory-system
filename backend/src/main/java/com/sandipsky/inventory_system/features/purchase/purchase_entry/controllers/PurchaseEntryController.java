package com.sandipsky.inventory_system.features.purchase.purchase_entry.controllers;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.services.PurchaseEntryService;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.dtos.MasterPurchaseEntryDTO;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.MasterPurchaseEntry;

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
@RequestMapping("/purchase")
public class PurchaseEntryController {

    @Autowired
    private PurchaseEntryService service;

    @Autowired
    private DocumentNumberingService documentNumberingService;

    @GetMapping("/generateNumber")
    @RequiresOperation("CreatePurchaseEntry")
    public String generatePurchaseNumber() {
        return documentNumberingService.generatePurchaseNumber();
    }

    @GetMapping()
    @RequiresOperation("ViewPurchaseEntry")
    public Page<MasterPurchaseEntryDTO> getPaginatedMasterPurchaseEntrysList(@RequestParam Map<String, String> params) {
        return service.getPaginatedMasterPurchaseEntrysList(params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewPurchaseEntry")
    public MasterPurchaseEntryDTO getMasterPurchaseEntry(@PathVariable int id) {
        return service.getMasterPurchaseEntryById(id);
    }

    @PostMapping()
    @RequiresOperation("CreatePurchaseEntry")
    public ResponseEntity<ApiResponse<MasterPurchaseEntry>> createMasterPurchaseEntry(@RequestBody MasterPurchaseEntryDTO masterPurchaseEntryDTO) {
        MasterPurchaseEntry res = service.saveMasterPurchaseEntry(masterPurchaseEntryDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Purchase Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditPurchaseEntry")
    public ResponseEntity<ApiResponse<MasterPurchaseEntry>> updateMasterPurchaseEntry(@PathVariable int id, @RequestBody MasterPurchaseEntryDTO masterPurchaseEntryDTO) {
        MasterPurchaseEntry res = service.updateMasterPurchaseEntry(id, masterPurchaseEntryDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Purchase Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeletePurchaseEntry")
    public ResponseEntity<ApiResponse<MasterPurchaseEntry>> deleteMasterPurchaseEntry(@PathVariable int id) {
        service.deleteMasterPurchaseEntry(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "Purchase Deleted successfully"));
    }
}
