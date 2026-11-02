package com.sandipsky.inventory_system.features.reports.purchase_return.controllers;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.reports.export.ReportColumns;
import com.sandipsky.inventory_system.features.reports.export.ReportExportService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import com.sandipsky.inventory_system.features.reports.purchase_return.services.PurchaseReturnReportService;
import com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnByBatchReportDTO;
import com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnByProductReportDTO;
import com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnByVendorReportDTO;
import com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnReportRowDTO;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/reports/purchase-return")
public class PurchaseReturnReportController {

    @Autowired
    private PurchaseReturnReportService service;

    @Autowired
    private ReportExportService reports;

    @GetMapping()
    @RequiresOperation("ViewPurchaseReturn")
    public List<PurchaseReturnReportRowDTO> getPurchaseReturnReport(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getPurchaseReturnReport(fromDate, toDate, dateType);
    }

    @GetMapping("/vendor")
    @RequiresOperation("ViewPurchaseReturn")
    public List<PurchaseReturnByVendorReportDTO> getPurchaseReturnByVendor(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getPurchaseReturnByVendor(fromDate, toDate, dateType);
    }

    @GetMapping("/product")
    @RequiresOperation("ViewPurchaseReturn")
    public List<PurchaseReturnByProductReportDTO> getPurchaseReturnByProduct(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getPurchaseReturnByProduct(fromDate, toDate, dateType);
    }

    @GetMapping("/batch")
    @RequiresOperation("ViewPurchaseReturn")
    public List<PurchaseReturnByBatchReportDTO> getPurchaseReturnByBatch(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getPurchaseReturnByBatch(fromDate, toDate, dateType);
    }

    // A report as an Excel or PDF file: /export/{format} for the register, /{report}/export/{format}
    // for vendor, product or batch. Takes the report's dates and the page's search and sort
    @GetMapping({ "/export/{format}", "/{report}/export/{format}" })
    @RequiresOperation("ViewPurchaseReturn")
    public ResponseEntity<byte[]> exportReport(@PathVariable(required = false) String report,
            @PathVariable String format,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType,
            @RequestParam Map<String, String> params) {
        ReportExportService.Range period = ReportExportService.Range.PERIOD;
        return switch (report == null ? "" : report) {
            case "" -> reports.file(format, "Purchase Return Register", period,
                    ReportColumns.register(ReportColumns.Party.VENDOR),
                    service.getPurchaseReturnReport(fromDate, toDate, dateType), params);
            case "vendor" -> reports.file(format, "Purchase Return by Vendor", period,
                    ReportColumns.party(ReportColumns.Party.VENDOR),
                    service.getPurchaseReturnByVendor(fromDate, toDate, dateType), params);
            case "product" -> reports.file(format, "Purchase Return by Product", period,
                    ReportColumns.PRODUCT,
                    service.getPurchaseReturnByProduct(fromDate, toDate, dateType), params);
            case "batch" -> reports.file(format, "Purchase Return by Batch", period,
                    ReportColumns.BATCH,
                    service.getPurchaseReturnByBatch(fromDate, toDate, dateType), params);
            default -> throw new ResourceNotFoundException("Report not found");
        };
    }
}
