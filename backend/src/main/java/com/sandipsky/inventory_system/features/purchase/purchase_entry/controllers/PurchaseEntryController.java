package com.sandipsky.inventory_system.features.purchase.purchase_entry.controllers;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.services.PurchaseEntryExportService;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.services.PurchaseEntryService;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.dtos.MasterPurchaseEntryDTO;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.MasterPurchaseEntry;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import java.util.Map;
import com.sandipsky.inventory_system.features.settings.document_numbering.services.DocumentNumberingService;
import com.sandipsky.inventory_system.common.util.ResponseUtil;
import com.sandipsky.inventory_system.common.export.ExportService;

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

    @Autowired
    private PurchaseEntryExportService exportService;

    @Autowired
    private ExportService files;

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

    // The purchases the list's filters match, as an Excel or PDF file
    @GetMapping("/export/{format}")
    @RequiresOperation("ViewPurchaseEntry")
    public ResponseEntity<byte[]> exportPurchases(@PathVariable String format, @RequestParam Map<String, String> params) {
        return files.table(format, "purchases", exportService.list(params), params);
    }

    // Every purchase between fromDate and toDate as invoices in one PDF
    @GetMapping("/print")
    @RequiresOperation("ViewPurchaseEntry")
    public ResponseEntity<byte[]> printPurchases(@RequestParam Map<String, String> params) {
        return files.documents("purchase-invoices", exportService.documents(params), "No purchases in this period", params);
    }

    // One purchase: its invoice as a PDF, or its lines as an Excel file
    @GetMapping("/{id}/export/{format}")
    @RequiresOperation("ViewPurchaseEntry")
    public ResponseEntity<byte[]> exportPurchase(@PathVariable int id, @PathVariable String format,
            @RequestParam Map<String, String> params) {
        return files.document(format, exportService.document(id), params);
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
