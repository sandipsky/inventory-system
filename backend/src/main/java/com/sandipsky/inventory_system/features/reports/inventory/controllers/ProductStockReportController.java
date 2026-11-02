package com.sandipsky.inventory_system.features.reports.inventory.controllers;
import com.sandipsky.inventory_system.features.reports.export.ReportColumns;
import com.sandipsky.inventory_system.features.reports.export.ReportExportService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import com.sandipsky.inventory_system.features.reports.inventory.services.ProductStockReportService;
import com.sandipsky.inventory_system.features.reports.inventory.dtos.ProductStockReportRowDTO;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/reports/inventory")
public class ProductStockReportController {

    @Autowired
    private ProductStockReportService service;

    @Autowired
    private ReportExportService reports;

    @GetMapping("/stock")
    @RequiresOperation("ViewStockEdit")
    public List<ProductStockReportRowDTO> getProductStockReport() {
        return service.getProductStockReport();
    }

    // The stock report as an Excel or PDF file, with the page's search and sort
    @GetMapping("/stock/export/{format}")
    @RequiresOperation("ViewStockEdit")
    public ResponseEntity<byte[]> exportProductStockReport(@PathVariable String format,
            @RequestParam Map<String, String> params) {
        return reports.file(format, "Stock Report", ReportExportService.Range.NONE, ReportColumns.STOCK,
                service.getProductStockReport(), params);
    }
}
