package com.sandipsky.inventory_system.features.reports.export;

import java.util.Map;
import java.util.function.Function;

import com.sandipsky.inventory_system.common.export.CellFormat;
import com.sandipsky.inventory_system.common.export.Formats;

// A column of a report file, like the web app's REPORTS config: `key` is the row's JSON field,
// `value` derives the cell when the row has no field for it, `total` adds it up
public record ReportColumn(String key, String header, Kind kind, boolean total,
        Function<Map<String, Object>, Object> value) {

    // How the cell shows: DOC_NO through the docNo format, BATCH as the batch name
    public enum Kind {
        TEXT, DOC_NO, BATCH, AMOUNT, NUMBER, DATE
    }

    public static ReportColumn text(String key, String header) {
        return new ReportColumn(key, header, Kind.TEXT, false, null);
    }

    public static ReportColumn docNo(String key, String header) {
        return new ReportColumn(key, header, Kind.DOC_NO, false, null);
    }

    public static ReportColumn batch(String key, String header) {
        return new ReportColumn(key, header, Kind.BATCH, false, null);
    }

    public static ReportColumn date(String key, String header) {
        return new ReportColumn(key, header, Kind.DATE, false, null);
    }

    public static ReportColumn number(String key, String header) {
        return new ReportColumn(key, header, Kind.NUMBER, false, null);
    }

    public static ReportColumn amount(String key, String header) {
        return new ReportColumn(key, header, Kind.AMOUNT, false, null);
    }

    // Adds the column up in the totals row
    public ReportColumn totalled() {
        return new ReportColumn(key, header, kind, true, value);
    }

    public ReportColumn derived(Function<Map<String, Object>, Object> derive) {
        return new ReportColumn(key, header, kind, total, derive);
    }

    // The raw value: what `value` derives, else the row's field. Sorting uses it
    public Object read(Map<String, Object> row) {
        return value != null ? value.apply(row) : row.get(key);
    }

    // The value as the file writes it
    public Object cell(Map<String, Object> row) {
        Object raw = read(row);
        return switch (kind) {
            case DOC_NO -> Formats.docNo(raw == null ? null : raw.toString());
            case BATCH -> Formats.batch(raw == null ? null : raw.toString());
            default -> raw;
        };
    }

    // The text a search looks in; figures and dates are left out, as on the page
    public String searchText(Map<String, Object> row) {
        return switch (kind) {
            case TEXT, DOC_NO, BATCH -> {
                Object cell = cell(row);
                yield cell == null ? "" : cell.toString();
            }
            default -> "";
        };
    }

    public CellFormat format() {
        return switch (kind) {
            case AMOUNT -> CellFormat.AMOUNT;
            case NUMBER -> CellFormat.NUMBER;
            case DATE -> CellFormat.DATE;
            default -> CellFormat.TEXT;
        };
    }
}
