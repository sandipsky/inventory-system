package com.sandipsky.inventory_system.features.purchase.purchase_return.controllers;
import com.sandipsky.inventory_system.features.purchase.purchase_return.services.PurchaseReturnExportService;
import com.sandipsky.inventory_system.common.export.ExportService;
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
    private PurchaseReturnExportService exportService;

    @Autowired
    private ExportService files;

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

    // The purchase returns the list's filters match, as an Excel or PDF file
    @GetMapping("/export/{format}")
    @RequiresOperation("ViewPurchaseReturn")
    public ResponseEntity<byte[]> exportPurchaseReturns(@PathVariable String format, @RequestParam Map<String, String> params) {
        return files.table(format, "purchase-returns", exportService.list(params), params);
    }

    // Every purchase return between fromDate and toDate in one PDF
    @GetMapping("/print")
    @RequiresOperation("ViewPurchaseReturn")
    public ResponseEntity<byte[]> printPurchaseReturns(@RequestParam Map<String, String> params) {
        return files.documents("purchase-returns", exportService.documents(params), "No purchase returns in this period", params);
    }

    // One purchase return as a PDF, or its lines as an Excel file
    @GetMapping("/{id}/export/{format}")
    @RequiresOperation("ViewPurchaseReturn")
    public ResponseEntity<byte[]> exportPurchaseReturn(@PathVariable int id, @PathVariable String format,
            @RequestParam Map<String, String> params) {
        return files.document(format, exportService.document(id), params);
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
