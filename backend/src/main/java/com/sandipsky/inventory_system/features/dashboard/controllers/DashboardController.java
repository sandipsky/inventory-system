package com.sandipsky.inventory_system.features.dashboard.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.sandipsky.inventory_system.features.dashboard.dtos.BalanceSummaryDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.NearExpiryBatchDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.PurchaseSummaryDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.PurchaseVsSalesDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.SalesSummaryDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.StockAlertsDTO;
import com.sandipsky.inventory_system.features.dashboard.services.DashboardService;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService service;

    @GetMapping("/balances")
    @RequiresOperation("ViewAccount")
    public BalanceSummaryDTO getBalances() {
        return service.getBalances();
    }

    @GetMapping("/purchase-vs-sales")
    @RequiresOperation({ "ViewPurchaseEntry", "ViewSalesEntries" })
    public PurchaseVsSalesDTO getPurchaseVsSales(
            @RequestParam(required = false, defaultValue = "monthly") String interval) {
        return service.getPurchaseVsSales(interval);
    }

    @GetMapping("/sales-summary")
    @RequiresOperation({ "ViewSalesEntries", "ViewSalesReturns" })
    public SalesSummaryDTO getSalesSummary(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        return service.getSalesSummary(fromDate, toDate);
    }

    @GetMapping("/purchase-summary")
    @RequiresOperation({ "ViewPurchaseEntry", "ViewPurchaseReturn" })
    public PurchaseSummaryDTO getPurchaseSummary(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        return service.getPurchaseSummary(fromDate, toDate);
    }

    @GetMapping("/near-expiry")
    @RequiresOperation("ViewStockEdit")
    public List<NearExpiryBatchDTO> getNearExpiry(@RequestParam(required = false, defaultValue = "6") int months) {
        return service.getNearExpiry(months);
    }

    @GetMapping("/stock-alerts")
    @RequiresOperation("ViewStockEdit")
    public StockAlertsDTO getStockAlerts() {
        return service.getStockAlerts();
    }
}
