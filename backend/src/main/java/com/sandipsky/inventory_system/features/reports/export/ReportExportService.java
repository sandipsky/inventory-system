package com.sandipsky.inventory_system.features.reports.export;

import java.math.BigInteger;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sandipsky.inventory_system.common.export.ExportService;
import com.sandipsky.inventory_system.common.export.ExportTable;
import com.sandipsky.inventory_system.common.export.Field;
import com.sandipsky.inventory_system.common.export.Formats;

// Report files. A report comes back whole and the page searches and sorts it itself, so the file
// takes the page's `search` and `sort` (`key:asc|desc`, a column key) and writes the same rows.
// Cancelled documents are kept, marked Cancelled and left out of the totals.
@Service
public class ReportExportService {

    // The dates a report takes: a from-to period, everything up to a date, or none (as of now)
    public enum Range {
        PERIOD, AS_OF, NONE
    }

    private static final String CANCELLED = "is_cancelled";
    private static final TypeReference<Map<String, Object>> ROW = new TypeReference<>() {
    };

    @Autowired
    private ExportService files;

    @Autowired
    private ObjectMapper objectMapper;

    public ResponseEntity<byte[]> file(String format, String title, Range range, List<ReportColumn> columns,
            List<?> source, Map<String, String> params) {
        List<Map<String, Object>> rows = source.stream()
                .map(row -> objectMapper.convertValue(row, ROW))
                .toList();
        String search = params.getOrDefault("search", "").trim();
        rows = sort(search(rows, columns, search), columns, params.get("sort"));

        ExportTable.Builder<Map<String, Object>> table = ExportTable.of(title);
        switch (range) {
            case PERIOD -> table.period(params.get("fromDate"), params.get("toDate"));
            case AS_OF -> table.detail(Field.date("As of", params.get("toDate")));
            case NONE -> table.detail(Field.date("As of", LocalDate.now().toString()));
        }
        table.detail(Field.text("Search", search));
        for (ReportColumn column : columns) {
            table.column(column.header(), column.format(), column::cell);
            if (column.total()) {
                table.total();
            }
        }
        if (rows.stream().anyMatch(row -> row.containsKey(CANCELLED))) {
            table.cancelledWhen(ReportExportService::isCancelled)
                    .text("Status", row -> isCancelled(row) ? "Cancelled" : "");
        }
        return files.table(format, Formats.fileName(title.toLowerCase()), table.build(rows), params);
    }

    private static boolean isCancelled(Map<String, Object> row) {
        return Boolean.TRUE.equals(row.get(CANCELLED));
    }

    // The rows with a text cell containing `search`, ignoring case
    static List<Map<String, Object>> search(List<Map<String, Object>> rows, List<ReportColumn> columns,
            String search) {
        if (search.isEmpty()) {
            return rows;
        }
        String needle = search.toLowerCase();
        return rows.stream()
                .filter(row -> columns.stream()
                        .anyMatch(column -> column.searchText(row).toLowerCase().contains(needle)))
                .toList();
    }

    // Sorted on one column: blanks last, numbers by size, text naturally (PE-2 before PE-10)
    static List<Map<String, Object>> sort(List<Map<String, Object>> rows, List<ReportColumn> columns,
            String sort) {
        if (sort == null || sort.isBlank()) {
            return rows;
        }
        String[] parts = sort.split(":");
        ReportColumn column = columns.stream().filter(each -> each.key().equals(parts[0].trim())).findFirst()
                .orElse(null);
        if (column == null) {
            return rows;
        }
        boolean descending = parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim());
        Comparator<Object> order = descending ? (a, b) -> compare(b, a) : ReportExportService::compare;
        List<Map<String, Object>> sorted = new ArrayList<>(rows);
        sorted.sort((a, b) -> {
            Object x = column.read(a);
            Object y = column.read(b);
            if (isBlank(x) || isBlank(y)) {
                return Boolean.compare(isBlank(x), isBlank(y));
            }
            return order.compare(x, y);
        });
        return sorted;
    }

    private static boolean isBlank(Object value) {
        return value == null || value.toString().isEmpty();
    }

    private static int compare(Object x, Object y) {
        if (x instanceof Number a && y instanceof Number b) {
            return Double.compare(a.doubleValue(), b.doubleValue());
        }
        return natural(x.toString(), y.toString());
    }

    // Text with runs of digits compared as numbers, ignoring case
    private static int natural(String a, String b) {
        int i = 0;
        int j = 0;
        while (i < a.length() && j < b.length()) {
            char x = a.charAt(i);
            char y = b.charAt(j);
            if (Character.isDigit(x) && Character.isDigit(y)) {
                int startI = i;
                int startJ = j;
                while (i < a.length() && Character.isDigit(a.charAt(i))) {
                    i++;
                }
                while (j < b.length() && Character.isDigit(b.charAt(j))) {
                    j++;
                }
                int byNumber = new BigInteger(a.substring(startI, i)).compareTo(new BigInteger(b.substring(startJ, j)));
                if (byNumber != 0) {
                    return byNumber;
                }
            } else {
                int byChar = Character.compare(Character.toLowerCase(x), Character.toLowerCase(y));
                if (byChar != 0) {
                    return byChar;
                }
                i++;
                j++;
            }
        }
        return Integer.compare(a.length() - i, b.length() - j);
    }
}
