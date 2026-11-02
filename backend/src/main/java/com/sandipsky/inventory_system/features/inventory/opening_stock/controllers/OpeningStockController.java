package com.sandipsky.inventory_system.features.inventory.opening_stock.controllers;
import com.sandipsky.inventory_system.features.inventory.opening_stock.services.OpeningStockExportService;
import com.sandipsky.inventory_system.common.export.ExportService;
import com.sandipsky.inventory_system.features.inventory.opening_stock.services.OpeningStockService;
import com.sandipsky.inventory_system.features.inventory.opening_stock.dtos.OpeningStockDTO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.sandipsky.inventory_system.common.dto.ApiResponse;
import java.util.Map;
import com.sandipsky.inventory_system.common.util.ResponseUtil;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;

import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/opening-stock")
public class OpeningStockController {

    @Autowired
    private OpeningStockService service;

    @Autowired
    private OpeningStockExportService exportService;

    @Autowired
    private ExportService files;

    @GetMapping()
    @RequiresOperation("ViewOpeningStock")
    public Page<OpeningStockDTO> getPaginatedOpeningStocksList(@RequestParam Map<String, String> params) {
        return service.getPaginatedOpeningStocksList(params);
    }

    // The batches the list's filters match, as an Excel or PDF file
    @GetMapping("/export/{format}")
    @RequiresOperation("ViewOpeningStock")
    public ResponseEntity<byte[]> exportOpeningStock(@PathVariable String format, @RequestParam Map<String, String> params) {
        return files.table(format, "opening-stock", exportService.list(params), params);
    }

    @PostMapping()
    @RequiresOperation("CreateOpeningStock")
    public ResponseEntity<ApiResponse<ProductStock>> saveOpeningStock(@RequestBody OpeningStockDTO openingStockDTO) {
        ProductStock res = service.saveOpeningStock(openingStockDTO);
        return ResponseEntity.ok(ResponseUtil.success(res.getId(), "Opening Stock Added successfully"));
    }
}
