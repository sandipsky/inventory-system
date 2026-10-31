package com.sandipsky.inventory_system.features.reports.accounting.controllers;
import com.sandipsky.inventory_system.features.reports.accounting.services.AccountingReportService;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.DueAmountReportRowDTO;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.JournalReportRowDTO;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.LedgerReportDTO;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.TrialBalanceRowDTO;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.sandipsky.inventory_system.security.RequiresOperation;

@RestController
@RequestMapping("/reports/accounting")
public class AccountingReportController {

    @Autowired
    private AccountingReportService service;

    @GetMapping("/journal")
    @RequiresOperation("ViewAccount")
    public List<JournalReportRowDTO> getJournalReport(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getJournalReport(fromDate, toDate, dateType);
    }

    @GetMapping("/ledger/{accountId}")
    @RequiresOperation("ViewAccount")
    public LedgerReportDTO getLedgerReport(@PathVariable int accountId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getLedgerReport(accountId, fromDate, toDate, dateType);
    }

    @GetMapping("/trial-balance")
    @RequiresOperation("ViewAccount")
    public List<TrialBalanceRowDTO> getTrialBalance(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType) {
        return service.getTrialBalance(fromDate, toDate, dateType);
    }

    @GetMapping("/due-amount")
    @RequiresOperation({ "ViewCustomerPayment", "ViewAccount" })
    public List<DueAmountReportRowDTO> getSalesDueAmountReport() {
        return service.getSalesDueAmountReport();
    }
}
