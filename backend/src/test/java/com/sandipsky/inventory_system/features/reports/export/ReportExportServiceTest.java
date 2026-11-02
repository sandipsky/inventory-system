package com.sandipsky.inventory_system.features.reports.export;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

class ReportExportServiceTest {

    private static final List<ReportColumn> COLUMNS = List.of(
            ReportColumn.docNo("system_entry_no", "Entry No"),
            ReportColumn.text("customer_name", "Customer"),
            ReportColumn.amount("grand_total", "Net Amt."));

    private static Map<String, Object> row(String number, String customer, Double total) {
        Map<String, Object> row = new HashMap<>();
        row.put("system_entry_no", number);
        row.put("customer_name", customer);
        row.put("grand_total", total);
        return row;
    }

    private static final List<Map<String, Object>> ROWS = List.of(
            row("|SI-10", "Ram Traders", 50.0), row("|SI-2", null, 226.0), row("|SI-1", "Hari Stores", 113.0));

    private static List<Object> numbers(List<Map<String, Object>> rows) {
        return rows.stream().map(row -> row.get("system_entry_no")).toList();
    }

    @Test
    void searchLooksInTextCellsAsShownIgnoringCase() {
        assertEquals(List.of("|SI-10"), numbers(ReportExportService.search(ROWS, COLUMNS, "RAM")));
        assertEquals(List.of("|SI-10", "|SI-1"), numbers(ReportExportService.search(ROWS, COLUMNS, "si-1")));
        assertEquals(List.of(), numbers(ReportExportService.search(ROWS, COLUMNS, "226")));
    }

    @Test
    void sortsNumbersBySizeTextNaturallyAndBlanksLast() {
        assertEquals(List.of("|SI-2", "|SI-1", "|SI-10"),
                numbers(ReportExportService.sort(ROWS, COLUMNS, "grand_total:desc")));
        assertEquals(List.of("|SI-1", "|SI-2", "|SI-10"),
                numbers(ReportExportService.sort(ROWS, COLUMNS, "system_entry_no:asc")));
        assertEquals(List.of("|SI-1", "|SI-10", "|SI-2"),
                numbers(ReportExportService.sort(ROWS, COLUMNS, "customer_name:asc")));
        assertEquals(List.of("|SI-10", "|SI-1", "|SI-2"),
                numbers(ReportExportService.sort(ROWS, COLUMNS, "customer_name:desc")));
    }

    @Test
    void anUnknownSortKeepsTheApiOrder() {
        assertEquals(numbers(ROWS), numbers(ReportExportService.sort(ROWS, COLUMNS, "nope:asc")));
    }
}
