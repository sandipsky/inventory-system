package com.sandipsky.inventory_system.features.reports.accounting.services;

import java.util.ArrayList;
import java.util.List;

import com.sandipsky.inventory_system.common.export.ExportTable;
import com.sandipsky.inventory_system.common.export.Formats;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.LedgerReportDTO;
import com.sandipsky.inventory_system.features.reports.accounting.dtos.LedgerReportRowDTO;

// A ledger as its page shows it: the opening balance, each line with the running balance after it
// (Dr for a debit balance, Cr for a credit one), and the totals with the closing balance
public class LedgerExport {

    // `row` is null on the opening balance line
    private record Line(Integer serial, LedgerReportRowDTO row, double balance) {
    }

    private LedgerExport() {
    }

    public static ExportTable table(LedgerReportDTO ledger, String fromDate, String toDate) {
        List<Line> lines = new ArrayList<>();
        lines.add(new Line(null, null, value(ledger.getOpeningBalance())));
        for (int i = 0; i < ledger.getRows().size(); i++) {
            LedgerReportRowDTO row = ledger.getRows().get(i);
            lines.add(new Line(i + 1, row, value(row.getBalance())));
        }
        double closing = value(ledger.getClosingBalance());
        return ExportTable.<Line>of("Ledger: " + ledger.getAccountName())
                .period(fromDate, toDate)
                .unnumbered()
                .number("S.N", Line::serial)
                .date("Date", line -> line.row() == null ? null : line.row().getDate())
                .text("Entry No", line -> line.row() == null ? null : Formats.docNo(line.row().getSystemEntryNo()))
                .text("Narration", line -> line.row() == null ? "Opening Balance" : line.row().getNarration())
                .amount("Debit", line -> line.row() == null ? null : line.row().getDebitAmount()).total()
                .amount("Credit", line -> line.row() == null ? null : line.row().getCreditAmount()).total()
                .amount("Balance", line -> Math.abs(line.balance())).totalAs(Math.abs(closing))
                .text("Dr/Cr", line -> side(line.balance())).totalAs(side(closing))
                .build(lines);
    }

    // The API's positive balance is a debit one
    private static String side(double balance) {
        if (balance > 0.005) {
            return "Dr";
        }
        return balance < -0.005 ? "Cr" : "";
    }

    private static double value(Double amount) {
        return amount == null ? 0 : amount;
    }
}
