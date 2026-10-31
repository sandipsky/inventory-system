package com.sandipsky.inventory_system.features.reports.inventory.controllers;
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

    @GetMapping("/stock")
    @RequiresOperation("ViewStockEdit")
    public List<ProductStockReportRowDTO> getProductStockReport() {
        return service.getProductStockReport();
    }
}
