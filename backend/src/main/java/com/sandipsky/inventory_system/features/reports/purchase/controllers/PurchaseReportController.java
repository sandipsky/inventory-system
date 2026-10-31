package com.sandipsky.inventory_system.features.reports.purchase.controllers;
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
}
