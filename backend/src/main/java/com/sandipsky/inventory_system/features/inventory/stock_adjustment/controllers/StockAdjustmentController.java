package com.sandipsky.inventory_system.features.inventory.stock_adjustment.controllers;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.services.StockAdjustmentExportService;
import com.sandipsky.inventory_system.common.export.ExportService;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.services.StockAdjustmentService;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.dtos.MasterStockAdjustmentDTO;
import com.sandipsky.inventory_system.features.inventory.stock_adjustment.entities.MasterStockAdjustment;

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
@RequestMapping("/stock-adjustment")
public class StockAdjustmentController {

    @Autowired
    private StockAdjustmentService service;

    @Autowired
    private StockAdjustmentExportService exportService;

    @Autowired
    private ExportService files;

    @Autowired
    private DocumentNumberingService documentNumberingService;

    @GetMapping("/generateNumber")
    @RequiresOperation("CreateStockAdjustment")
    public String generateStockAdjustmentNumber() {
        return documentNumberingService.generateStockAdjustmentNumber();
    }

    @GetMapping()
    @RequiresOperation("ViewStockAdjustment")
    public Page<MasterStockAdjustmentDTO> getPaginatedMasterStockAdjustmentsList(@RequestParam Map<String, String> params) {
        return service.getPaginatedMasterStockAdjustmentsList(params);
    }

    // The adjustments the list's filters match, as an Excel or PDF file
    @GetMapping("/export/{format}")
    @RequiresOperation("ViewStockAdjustment")
    public ResponseEntity<byte[]> exportStockAdjustments(@PathVariable String format, @RequestParam Map<String, String> params) {
        return files.table(format, "stock-adjustments", exportService.list(params), params);
    }

    // One adjustment with its lines, as a PDF or an Excel file
    @GetMapping("/{id}/export/{format}")
    @RequiresOperation("ViewStockAdjustment")
    public ResponseEntity<byte[]> exportStockAdjustment(@PathVariable int id, @PathVariable String format,
            @RequestParam Map<String, String> params) {
        return files.document(format, exportService.document(id), params);
    }

    @GetMapping("/{id}")
    @RequiresOperation("ViewStockAdjustment")
    public MasterStockAdjustmentDTO getMasterStockAdjustment(@PathVariable int id) {
        return service.getMasterStockAdjustmentById(id);
    }

    @PostMapping()
    @RequiresOperation("CreateStockAdjustment")
    public ResponseEntity<ApiResponse<MasterStockAdjustment>> createMasterStockAdjustment(
            @RequestBody MasterStockAdjustmentDTO masterStockAdjustmentDTO) {
        MasterStockAdjustment res = service.saveMasterStockAdjustment(masterStockAdjustmentDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Stock Adjustment Added successfully"));
    }

    @PutMapping("/{id}")
    @RequiresOperation("EditStockAdjustment")
    public ResponseEntity<ApiResponse<MasterStockAdjustment>> updateMasterStockAdjustment(@PathVariable int id,
            @RequestBody MasterStockAdjustmentDTO masterStockAdjustmentDTO) {
        MasterStockAdjustment res = service.updateMasterStockAdjustment(id, masterStockAdjustmentDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Stock Adjustment Updated successfully"));
    }

    @DeleteMapping("/{id}")
    @RequiresOperation("DeleteStockAdjustment")
    public ResponseEntity<ApiResponse<MasterStockAdjustment>> deleteMasterStockAdjustment(@PathVariable int id) {
        service.deleteMasterStockAdjustment(id);
        return ResponseEntity.ok(ResponseUtil.success(id, "Stock Adjustment Deleted successfully"));
    }
}
