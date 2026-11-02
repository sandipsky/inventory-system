package com.sandipsky.inventory_system.features.sales.sales_return.controllers;
import com.sandipsky.inventory_system.features.sales.sales_return.services.SalesReturnExportService;
import com.sandipsky.inventory_system.common.export.ExportService;
import com.sandipsky.inventory_system.features.sales.sales_return.services.SalesReturnService;
import com.sandipsky.inventory_system.features.sales.sales_return.dtos.MasterSalesReturnDTO;
import com.sandipsky.inventory_system.features.sales.sales_return.entities.MasterSalesReturn;

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
@RequestMapping("/sales-return")
public class SalesReturnController {

    @Autowired
    private SalesReturnService service;

    @Autowired
    private SalesReturnExportService exportService;

    @Autowired
    private ExportService files;

    @Autowired
    private DocumentNumberingService documentNumberingService;

    @GetMapping("/generateNumber")
    @RequiresOperation("CreateSalesReturn")
    public String generateSalesReturnNumber() {
        return documentNumberingService.generateSalesReturnNumber();
    }

    @GetMapping()
    @RequiresOperation("ViewSalesReturns")
    public Page<MasterSalesReturnDTO> getPaginatedMasterSalesReturnsList(@RequestParam Map<String, String> params) {
        return service.getPaginatedMasterSalesReturnsList(params);
    }

    // The sales returns the list's filters match, as an Excel or PDF file
    @GetMapping("/export/{format}")
    @RequiresOperation("ViewSalesReturns")
    public ResponseEntity<byte[]> exportSalesReturns(@PathVariable String format, @RequestParam Map<String, String> params) {
        return files.table(format, "sales-returns", exportService.list(params), params);
    }

    // Every sales return between fromDate and toDate in one PDF, cancelled ones marked
    @GetMapping("/print")
    @RequiresOperation("ViewSalesReturns")
    public ResponseEntity<byte[]> printSalesReturns(@RequestParam Map<String, String> params) {
        return files.documents("sales-returns", exportService.documents(params), "No sales returns in this period", params);
    }

    // One sales return as a PDF, or its lines as an Excel file
    @GetMapping("/{id}/export/{format}")
    @RequiresOperation("ViewSalesReturns")
    public ResponseEntity<byte[]> exportSalesReturn(@PathVariable int id, @PathVariable String format,
            @RequestParam Map<String, String> params) {
        return files.document(format, exportService.document(id), params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewSalesReturns")
    public MasterSalesReturnDTO getMasterSalesReturn(@PathVariable int id) {
        return service.getMasterSalesReturnById(id);
    }

    @PostMapping()
    @RequiresOperation("CreateSalesReturn")
    public ResponseEntity<ApiResponse<MasterSalesReturn>> createMasterSalesReturn(
            @RequestBody MasterSalesReturnDTO masterSalesReturnDTO) {
        MasterSalesReturn res = service.saveMasterSalesReturn(masterSalesReturnDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Sales Return Added successfully"));
    }

    @PostMapping("/{id}")
    @RequiresOperation("CancelSalesReturn")
    public ResponseEntity<ApiResponse<MasterSalesReturn>> cancelMasterSalesReturn(@PathVariable int id,
            @RequestBody MasterSalesReturnDTO masterSalesReturnDTO) {
        service.cancelMasterSalesReturn(id, masterSalesReturnDTO);
        return ResponseEntity.ok(ResponseUtil.success(id, "Sales Return Cancelled successfully"));
    }
}
