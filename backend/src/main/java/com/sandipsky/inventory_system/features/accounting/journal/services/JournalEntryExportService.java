package com.sandipsky.inventory_system.features.accounting.journal.services;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.common.export.DocumentParts;
import com.sandipsky.inventory_system.common.export.ExportTable;
import com.sandipsky.inventory_system.common.export.Field;
import com.sandipsky.inventory_system.common.export.Formats;
import com.sandipsky.inventory_system.common.export.PrintDocument;
import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import com.sandipsky.inventory_system.features.accounting.journal.dtos.JournalEntryDTO;
import com.sandipsky.inventory_system.features.accounting.journal.dtos.MasterJournalEntryDTO;

// Files of manual journals: the list, one row per journal line, and one journal as a voucher
@Service
public class JournalEntryExportService {

    @Autowired
    private JournalEntryService service;

    // A journal line with the journal it belongs to
    private record Line(MasterJournalEntryDTO journal, JournalEntryDTO entry) {
    }

    // Every line of the journals the list's filters match, in its sort
    public ExportTable list(Map<String, String> params) {
        List<Line> lines = service.getPaginatedJournalEntries(QueryParamUtil.allRows(params)).getContent().stream()
                .flatMap(journal -> journal.getJournalEntries() == null ? Stream.empty()
                        : journal.getJournalEntries().stream().map(entry -> new Line(journal, entry)))
                .toList();
        return ExportTable.<Line>of("Journal Entries")
                .period(params.get("fromDate"), params.get("toDate"))
                .unnumbered()
                .text("Journal Number", line -> Formats.docNo(line.journal().getSystemEntryNo()))
                .date("Date", line -> line.journal().getDate())
                .text("Remarks", line -> line.journal().getRemarks())
                .text("Account", line -> line.entry().getAccountMasterName())
                .text("Narration", line -> line.entry().getNarration())
                .amount("Debit", line -> line.entry().getDebitAmount()).total()
                .amount("Credit", line -> line.entry().getCreditAmount()).total()
                .build(lines);
    }

    public PrintDocument document(int id) {
        MasterJournalEntryDTO journal = service.getJournalEntryById(id);
        ExportTable lines = ExportTable.<JournalEntryDTO>of("Lines")
                .text("Account", JournalEntryDTO::getAccountMasterName)
                .text("Narration", JournalEntryDTO::getNarration)
                .amount("Debit", JournalEntryDTO::getDebitAmount).total()
                .amount("Credit", JournalEntryDTO::getCreditAmount).total()
                .build(journal.getJournalEntries());
        return new PrintDocument(
                "Journal Voucher",
                journal.getSystemEntryNo(),
                null,
                List.of(),
                DocumentParts.present(
                        Field.text("Journal No.", Formats.docNo(journal.getSystemEntryNo())),
                        Field.date("Date", journal.getDate())),
                lines,
                List.of(),
                DocumentParts.present(Field.text("Remarks", journal.getRemarks())));
    }
}
