package com.sandipsky.inventory_system.features.reports.sales_return.controllers;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.reports.export.ReportColumns;
import com.sandipsky.inventory_system.features.reports.export.ReportExportService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
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

    @Autowired
    private ReportExportService reports;

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

    // A report as an Excel or PDF file: /export/{format} for the register, /{report}/export/{format}
    // for customer, product or batch. Takes the report's dates and the page's search and sort
    @GetMapping({ "/export/{format}", "/{report}/export/{format}" })
    @RequiresOperation("ViewSalesReturns")
    public ResponseEntity<byte[]> exportReport(@PathVariable(required = false) String report,
            @PathVariable String format,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType,
            @RequestParam Map<String, String> params) {
        ReportExportService.Range period = ReportExportService.Range.PERIOD;
        return switch (report == null ? "" : report) {
            case "" -> reports.file(format, "Sales Return Register", period,
                    ReportColumns.register(ReportColumns.Party.CUSTOMER),
                    service.getSalesReturnReport(fromDate, toDate, dateType), params);
            case "customer" -> reports.file(format, "Sales Return by Customer", period,
                    ReportColumns.party(ReportColumns.Party.CUSTOMER),
                    service.getSalesReturnByCustomer(fromDate, toDate, dateType), params);
            case "product" -> reports.file(format, "Sales Return by Product", period,
                    ReportColumns.PRODUCT,
                    service.getSalesReturnByProduct(fromDate, toDate, dateType), params);
            case "batch" -> reports.file(format, "Sales Return by Batch", period,
                    ReportColumns.BATCH,
                    service.getSalesReturnByBatch(fromDate, toDate, dateType), params);
            default -> throw new ResourceNotFoundException("Report not found");
        };
    }
}
