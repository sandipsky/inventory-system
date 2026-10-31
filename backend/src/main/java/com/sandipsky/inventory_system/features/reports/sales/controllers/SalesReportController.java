package com.sandipsky.inventory_system.features.reports.sales.controllers;
import com.sandipsky.inventory_system.features.reports.sales.services.SalesReportService;
import com.sandipsky.inventory_system.features.reports.sales.dtos.SalesByCustomerReportDTO;
import com.sandipsky.inventory_system.features.reports.sales.dtos.SalesByProductReportDTO;
import com.sandipsky.inventory_system.features.reports.sales.dtos.SalesReportRowDTO;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/reports/sales")
public class SalesReportController {

    @Autowired
    private SalesReportService service;

    @GetMapping()
    @RequiresOperation("ViewSalesEntries")
    public List<SalesReportRowDTO> getSalesReport(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getSalesReport(fromDate, toDate, dateType);
    }

    @GetMapping("/customer")
    @RequiresOperation("ViewSalesEntries")
    public List<SalesByCustomerReportDTO> getSalesByCustomer(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getSalesByCustomer(fromDate, toDate, dateType);
    }

    @GetMapping("/product")
    @RequiresOperation("ViewSalesEntries")
    public List<SalesByProductReportDTO> getSalesByProduct(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getSalesByProduct(fromDate, toDate, dateType);
    }
}
