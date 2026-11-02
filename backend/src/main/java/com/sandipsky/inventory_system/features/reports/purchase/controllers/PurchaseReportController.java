package com.sandipsky.inventory_system.features.reports.purchase.controllers;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.reports.export.ReportColumns;
import com.sandipsky.inventory_system.features.reports.export.ReportExportService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import com.sandipsky.inventory_system.features.reports.purchase.services.PurchaseReportService;
import com.sandipsky.inventory_system.features.reports.purchase.dtos.PurchaseByBatchReportDTO;
import com.sandipsky.inventory_system.features.reports.purchase.dtos.PurchaseByProductReportDTO;
import com.sandipsky.inventory_system.features.reports.purchase.dtos.PurchaseByVendorReportDTO;
import com.sandipsky.inventory_system.features.reports.purchase.dtos.PurchaseReportRowDTO;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/reports/purchase")
public class PurchaseReportController {

    @Autowired
    private PurchaseReportService service;

    @Autowired
    private ReportExportService reports;

    @GetMapping()
    @RequiresOperation("ViewPurchaseEntry")
    public List<PurchaseReportRowDTO> getPurchaseReport(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getPurchaseReport(fromDate, toDate, dateType);
    }

    @GetMapping("/vendor")
    @RequiresOperation("ViewPurchaseEntry")
    public List<PurchaseByVendorReportDTO> getPurchaseByVendor(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getPurchaseByVendor(fromDate, toDate, dateType);
    }

    @GetMapping("/product")
    @RequiresOperation("ViewPurchaseEntry")
    public List<PurchaseByProductReportDTO> getPurchaseByProduct(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getPurchaseByProduct(fromDate, toDate, dateType);
    }

    @GetMapping("/batch")
    @RequiresOperation("ViewPurchaseEntry")
    public List<PurchaseByBatchReportDTO> getPurchaseByBatch(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getPurchaseByBatch(fromDate, toDate, dateType);
    }

    // A report as an Excel or PDF file: /export/{format} for the register, /{report}/export/{format}
    // for vendor, product or batch. Takes the report's dates and the page's search and sort
    @GetMapping({ "/export/{format}", "/{report}/export/{format}" })
    @RequiresOperation("ViewPurchaseEntry")
    public ResponseEntity<byte[]> exportReport(@PathVariable(required = false) String report,
            @PathVariable String format,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType,
            @RequestParam Map<String, String> params) {
        ReportExportService.Range period = ReportExportService.Range.PERIOD;
        return switch (report == null ? "" : report) {
            case "" -> reports.file(format, "Purchase Register", period,
                    ReportColumns.register(ReportColumns.Party.VENDOR),
                    service.getPurchaseReport(fromDate, toDate, dateType), params);
            case "vendor" -> reports.file(format, "Purchase by Vendor", period,
                    ReportColumns.party(ReportColumns.Party.VENDOR),
                    service.getPurchaseByVendor(fromDate, toDate, dateType), params);
            case "product" -> reports.file(format, "Purchase by Product", period,
                    ReportColumns.PRODUCT,
                    service.getPurchaseByProduct(fromDate, toDate, dateType), params);
            case "batch" -> reports.file(format, "Purchase by Batch", period,
                    ReportColumns.BATCH,
                    service.getPurchaseByBatch(fromDate, toDate, dateType), params);
            default -> throw new ResourceNotFoundException("Report not found");
        };
    }
}
