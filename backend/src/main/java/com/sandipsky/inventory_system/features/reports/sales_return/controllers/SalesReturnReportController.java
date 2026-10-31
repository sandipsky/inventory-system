package com.sandipsky.inventory_system.features.reports.sales_return.controllers;
import com.sandipsky.inventory_system.features.reports.sales_return.services.SalesReturnReportService;
import com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnByBatchReportDTO;
import com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnByCustomerReportDTO;
import com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnByProductReportDTO;
import com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnReportRowDTO;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/reports/sales-return")
public class SalesReturnReportController {

    @Autowired
    private SalesReturnReportService service;

    @GetMapping()
    @RequiresOperation("ViewSalesReturns")
    public List<SalesReturnReportRowDTO> getSalesReturnReport(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getSalesReturnReport(fromDate, toDate, dateType);
    }

    @GetMapping("/customer")
    @RequiresOperation("ViewSalesReturns")
    public List<SalesReturnByCustomerReportDTO> getSalesReturnByCustomer(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getSalesReturnByCustomer(fromDate, toDate, dateType);
    }

    @GetMapping("/product")
    @RequiresOperation("ViewSalesReturns")
    public List<SalesReturnByProductReportDTO> getSalesReturnByProduct(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getSalesReturnByProduct(fromDate, toDate, dateType);
    }

    @GetMapping("/batch")
    @RequiresOperation("ViewSalesReturns")
    public List<SalesReturnByBatchReportDTO> getSalesReturnByBatch(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getSalesReturnByBatch(fromDate, toDate, dateType);
    }
}
