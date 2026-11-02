package com.sandipsky.inventory_system.common.export;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

class ExcelFileTest {

    private record Line(String date, double amount) {
    }

    private static final ExportTable TABLE = ExportTable.<Line>of("Sales")
            .date("Date", Line::date)
            .amount("Amount", Line::amount).total()
            .build(List.of(new Line("2026-11-02", 1130), new Line("2026-11-01", 226)));

    private static Sheet write(boolean bs) throws IOException {
        ExportContext context = new ExportContext("Test Pvt. Ltd.", List.of("Kathmandu"), bs, "admin",
                LocalDateTime.of(2026, 11, 2, 10, 30));
        return new XSSFWorkbook(new ByteArrayInputStream(ExcelFile.table(TABLE, context))).getSheetAt(0);
    }

    // The S.N / Date / Amount header row, found by its text
    private static int headerRow(Sheet sheet) {
        for (Row row : sheet) {
            if ("S.N".equals(row.getCell(0).getStringCellValue())) {
                return row.getRowNum();
            }
        }
        throw new AssertionError("no header row");
    }

    @Test
    void writesAdDatesAsDatesAndAmountsAsNumbersWithATotalsRow() throws IOException {
        Sheet sheet = write(false);
        int header = headerRow(sheet);
        Row first = sheet.getRow(header + 1);

        assertEquals("Test Pvt. Ltd.", sheet.getRow(0).getCell(0).getStringCellValue());
        assertEquals(1, first.getCell(0).getNumericCellValue());
        assertTrue(DateUtil.isCellDateFormatted(first.getCell(1)));
        assertEquals(1130, first.getCell(2).getNumericCellValue());
        Row totals = sheet.getRow(header + 3);
        assertEquals("Total", totals.getCell(1).getStringCellValue());
        assertEquals(1356, totals.getCell(2).getNumericCellValue());
    }

    @Test
    void writesBsDatesAsText() throws IOException {
        Sheet sheet = write(true);
        Row first = sheet.getRow(headerRow(sheet) + 1);

        assertEquals(CellType.STRING, first.getCell(1).getCellType());
        assertEquals("2083-07-16", first.getCell(1).getStringCellValue());
    }
}
