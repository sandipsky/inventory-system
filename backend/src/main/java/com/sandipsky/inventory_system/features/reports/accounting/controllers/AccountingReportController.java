package com.sandipsky.inventory_system.features.reports.accounting.controllers;
import com.sandipsky.inventory_system.common.export.ExportService;
import com.sandipsky.inventory_system.common.export.Formats;
import com.sandipsky.inventory_system.features.reports.accounting.services.LedgerExport;
import com.sandipsky.inventory_system.features.reports.export.ReportColumns;
import com.sandipsky.inventory_system.features.reports.export.ReportExportService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import com.sandipsky.inventory_system.features.reports.accounting.services.AccountingReportService;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.JournalReportRowDTO;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.LedgerReportDTO;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.OutstandingInvoiceReportRowDTO;
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

    @Autowired
    private ReportExportService reports;

    @Autowired
    private ExportService files;

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

    @GetMapping("/receivable")
    @RequiresOperation({ "ViewCustomerPayment", "ViewAccount", "CreatePaymentAdjustment" })
    public List<OutstandingInvoiceReportRowDTO> getReceivableReport() {
        return service.getReceivableReport();
    }

    @GetMapping("/payable")
    @RequiresOperation({ "ViewVendorPayment", "ViewAccount", "CreatePaymentAdjustment" })
    public List<OutstandingInvoiceReportRowDTO> getPayableReport() {
        return service.getPayableReport();
    }

    // The journal report as an Excel or PDF file, with the page's search and sort
    @GetMapping("/journal/export/{format}")
    @RequiresOperation("ViewAccount")
    public ResponseEntity<byte[]> exportJournalReport(@PathVariable String format,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType,
            @RequestParam Map<String, String> params) {
        return reports.file(format, "Journal Report", ReportExportService.Range.PERIOD, ReportColumns.JOURNAL,
                service.getJournalReport(fromDate, toDate, dateType), params);
    }

    // One account's ledger as an Excel or PDF file
    @GetMapping("/ledger/{accountId}/export/{format}")
    @RequiresOperation("ViewAccount")
    public ResponseEntity<byte[]> exportLedgerReport(@PathVariable int accountId, @PathVariable String format,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType,
            @RequestParam Map<String, String> params) {
        LedgerReportDTO ledger = service.getLedgerReport(accountId, fromDate, toDate, dateType);
        return files.table(format, "ledger-" + Formats.fileName(ledger.getAccountName().toLowerCase()),
                LedgerExport.table(ledger, fromDate, toDate), params);
    }

    // The trial balance as an Excel or PDF file, with the page's search and sort
    @GetMapping("/trial-balance/export/{format}")
    @RequiresOperation("ViewAccount")
    public ResponseEntity<byte[]> exportTrialBalance(@PathVariable String format,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false, defaultValue = "AD") String dateType,
            @RequestParam Map<String, String> params) {
        return reports.file(format, "Trial Balance", ReportExportService.Range.AS_OF, ReportColumns.TRIAL_BALANCE,
                service.getTrialBalance(fromDate, toDate, dateType), params);
    }

    // Accounts receivable as an Excel or PDF file, with the page's search and sort
    @GetMapping("/receivable/export/{format}")
    @RequiresOperation({ "ViewCustomerPayment", "ViewAccount", "CreatePaymentAdjustment" })
    public ResponseEntity<byte[]> exportReceivableReport(@PathVariable String format,
            @RequestParam Map<String, String> params) {
        return reports.file(format, "Accounts Receivable", ReportExportService.Range.NONE,
                ReportColumns.outstanding(ReportColumns.Party.CUSTOMER), service.getReceivableReport(), params);
    }

    // Accounts payable as an Excel or PDF file, with the page's search and sort
    @GetMapping("/payable/export/{format}")
    @RequiresOperation({ "ViewVendorPayment", "ViewAccount", "CreatePaymentAdjustment" })
    public ResponseEntity<byte[]> exportPayableReport(@PathVariable String format,
            @RequestParam Map<String, String> params) {
        return reports.file(format, "Accounts Payable", ReportExportService.Range.NONE,
                ReportColumns.outstanding(ReportColumns.Party.VENDOR), service.getPayableReport(), params);
    }
}
