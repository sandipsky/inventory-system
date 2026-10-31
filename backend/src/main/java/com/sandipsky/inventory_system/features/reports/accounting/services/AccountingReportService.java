package com.sandipsky.inventory_system.features.reports.accounting.services;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.DueAmountReportRowDTO;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.JournalReportRowDTO;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.LedgerReportDTO;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.LedgerReportRowDTO;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.TrialBalanceRowDTO;
import com.sandipsky.inventory_system.features.reports.accounting.repositories.AccountingReportRepository;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.features.accounting.account.entities.AccountMaster;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.common.util.ReportDateUtil;
import com.sandipsky.inventory_system.features.accounting.account.repositories.AccountMasterRepository;

@Service
public class AccountingReportService {

    @Autowired
    private AccountingReportRepository repository;

    @Autowired
    private AccountMasterRepository accountMasterRepository;

    public List<JournalReportRowDTO> getJournalReport(String fromDate, String toDate, String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findJournalReport(fromDate, toDate);
    }

    public LedgerReportDTO getLedgerReport(int accountId, String fromDate, String toDate, String dateType) {
        ReportDateUtil.validateDateType(dateType);
        AccountMaster account = accountMasterRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        double openingBalance = 0;
        if (fromDate != null && !fromDate.isEmpty()) {
            Double before = repository.findOpeningBalance(accountId, fromDate);
            openingBalance = before != null ? before : 0;
        }

        List<LedgerReportRowDTO> rows = repository.findLedgerRows(accountId, fromDate, toDate);

        double runningBalance = openingBalance;
        double totalDebit = 0;
        double totalCredit = 0;
        for (LedgerReportRowDTO row : rows) {
            double debit = row.getDebitAmount() != null ? row.getDebitAmount() : 0;
            double credit = row.getCreditAmount() != null ? row.getCreditAmount() : 0;
            runningBalance += debit - credit;
            totalDebit += debit;
            totalCredit += credit;
            row.setBalance(runningBalance);
        }

        LedgerReportDTO report = new LedgerReportDTO();
        report.setAccountId(account.getId());
        report.setAccountName(account.getAccountName());
        report.setOpeningBalance(openingBalance);
        report.setTotalDebit(totalDebit);
        report.setTotalCredit(totalCredit);
        report.setClosingBalance(runningBalance);
        report.setRows(rows);
        return report;
    }

    public List<TrialBalanceRowDTO> getTrialBalance(String fromDate, String toDate, String dateType) {
        ReportDateUtil.validateDateType(dateType);
        List<TrialBalanceRowDTO> rows = repository.findTrialBalance(fromDate, toDate);
        for (TrialBalanceRowDTO row : rows) {
            double debit = row.getTotalDebit() != null ? row.getTotalDebit() : 0;
            double credit = row.getTotalCredit() != null ? row.getTotalCredit() : 0;
            double net = debit - credit;
            row.setDebitBalance(net > 0 ? net : 0);
            row.setCreditBalance(net < 0 ? -net : 0);
        }
        return rows;
    }

    public List<DueAmountReportRowDTO> getSalesDueAmountReport() {
        return repository.findSalesDueAmounts();
    }
}
