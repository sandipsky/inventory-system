package com.sandipsky.inventory_system.features.reports.sales.controllers;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.reports.export.ReportColumns;
import com.sandipsky.inventory_system.features.reports.export.ReportExportService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import com.sandipsky.inventory_system.features.reports.sales.services.SalesReportService;
import com.sandipsky.inventory_system.features.reports.sales.dtos.SalesByCustomerReportDTO;
import com.sandipsky.inventory_system.features.reports.sales.dtos.SalesByBatchReportDTO;
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

    @Autowired
    private ReportExportService reports;

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

    @GetMapping("/batch")
    @RequiresOperation("ViewSalesEntries")
    public List<SalesByBatchReportDTO> getSalesByBatch(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getSalesByBatch(fromDate, toDate, dateType);
    }

    // A report as an Excel or PDF file: /export/{format} for the register, /{report}/export/{format}
    // for customer, product or batch. Takes the report's dates and the page's search and sort
    @GetMapping({ "/export/{format}", "/{report}/export/{format}" })
    @RequiresOperation("ViewSalesEntries")
    public ResponseEntity<byte[]> exportReport(@PathVariable(required = false) String report,
            @PathVariable String format,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType,
            @RequestParam Map<String, String> params) {
        ReportExportService.Range period = ReportExportService.Range.PERIOD;
        return switch (report == null ? "" : report) {
            case "" -> reports.file(format, "Sales Register", period,
                    ReportColumns.register(ReportColumns.Party.CUSTOMER),
                    service.getSalesReport(fromDate, toDate, dateType), params);
            case "customer" -> reports.file(format, "Sales by Customer", period,
                    ReportColumns.party(ReportColumns.Party.CUSTOMER),
                    service.getSalesByCustomer(fromDate, toDate, dateType), params);
            case "product" -> reports.file(format, "Sales by Product", period,
                    ReportColumns.PRODUCT,
                    service.getSalesByProduct(fromDate, toDate, dateType), params);
            case "batch" -> reports.file(format, "Sales by Batch", period,
                    ReportColumns.BATCH,
                    service.getSalesByBatch(fromDate, toDate, dateType), params);
            default -> throw new ResourceNotFoundException("Report not found");
        };
    }
}
