package com.sandipsky.inventory_system.features.sales.sales_entry.controllers;
import com.sandipsky.inventory_system.features.sales.sales_entry.services.SalesEntryExportService;
import com.sandipsky.inventory_system.common.export.ExportService;
import com.sandipsky.inventory_system.features.sales.sales_entry.services.SalesEntryService;
import com.sandipsky.inventory_system.features.sales.sales_entry.dtos.MasterSalesEntryDTO;
import com.sandipsky.inventory_system.features.sales.sales_entry.entities.MasterSalesEntry;

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
@RequestMapping("/sales")
public class SalesEntryController {

    @Autowired
    private SalesEntryService service;

    @Autowired
    private SalesEntryExportService exportService;

    @Autowired
    private ExportService files;

    @Autowired
    private DocumentNumberingService documentNumberingService;

    @GetMapping("/generateNumber")
    @RequiresOperation("CreateSalesEntry")
    public String generateSalesNumber() {
        return documentNumberingService.generateSalesNumber();
    }

    @GetMapping()
    @RequiresOperation("ViewSalesEntries")
    public Page<MasterSalesEntryDTO> getPaginatedMasterSalesEntrysList(@RequestParam Map<String, String> params) {
        return service.getPaginatedMasterSalesEntrysList(params);
    }

    // The sales the list's filters match, as an Excel or PDF file
    @GetMapping("/export/{format}")
    @RequiresOperation("ViewSalesEntries")
    public ResponseEntity<byte[]> exportSales(@PathVariable String format, @RequestParam Map<String, String> params) {
        return files.table(format, "sales", exportService.list(params), params);
    }

    // Every sale between fromDate and toDate as invoices in one PDF, cancelled ones marked
    @GetMapping("/print")
    @RequiresOperation("ViewSalesEntries")
    public ResponseEntity<byte[]> printSales(@RequestParam Map<String, String> params) {
        return files.documents("sales-invoices", exportService.documents(params), "No sales in this period", params);
    }

    // One sale: its invoice as a PDF, or its lines as an Excel file
    @GetMapping("/{id}/export/{format}")
    @RequiresOperation("ViewSalesEntries")
    public ResponseEntity<byte[]> exportSale(@PathVariable int id, @PathVariable String format,
            @RequestParam Map<String, String> params) {
        return files.document(format, exportService.document(id), params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewSalesEntries")
    public MasterSalesEntryDTO getMasterSalesEntry(@PathVariable int id) {
        return service.getMasterSalesEntryById(id);
    }

    @PostMapping()
    @RequiresOperation("CreateSalesEntry")
    public ResponseEntity<ApiResponse<MasterSalesEntry>> createMasterSalesEntry(@RequestBody MasterSalesEntryDTO masterSalesEntryDTO) {
        MasterSalesEntry res = service.saveMasterSalesEntry(masterSalesEntryDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Sales Added successfully"));
    }

    @PostMapping("/{id}")
    @RequiresOperation("CancelSalesEntry")
    public ResponseEntity<ApiResponse<MasterSalesEntry>> cancelMasterSalesEntry(@PathVariable int id, @RequestBody MasterSalesEntryDTO masterSalesEntryDTO) {
        service.cancelMasterSalesEntry(id, masterSalesEntryDTO);
        return ResponseEntity.ok(ResponseUtil.success(id, "Sales Cancelled successfully"));
    }
}
