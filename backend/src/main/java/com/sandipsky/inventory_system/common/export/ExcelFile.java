package com.sandipsky.inventory_system.common.export;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.WorkbookUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

// Writes tables and documents as .xlsx: the letterhead and title on top, then typed cells (amounts
// and quantities as numbers, AD dates as real dates, BS dates as text) and a bold totals row
final class ExcelFile {

    private static final int MIN_WIDTH = 6;
    private static final int MAX_WIDTH = 60;

    private final XSSFWorkbook workbook = new XSSFWorkbook();
    private final Sheet sheet;
    private final ExportContext context;
    private final Map<String, CellStyle> styles = new HashMap<>();
    // Longest text per column, for its width
    private final Map<Integer, Integer> widths = new HashMap<>();
    private int rowIndex;

    private ExcelFile(String sheetName, ExportContext context) {
        this.sheet = workbook.createSheet(WorkbookUtil.createSafeSheetName(sheetName));
        this.context = context;
    }

    static byte[] table(ExportTable table, ExportContext context) {
        ExcelFile file = new ExcelFile(table.title(), context);
        file.heading(table.title(), null);
        file.fields(table.details());
        file.rowIndex++;
        file.table(table, true);
        return file.finish();
    }

    static byte[] document(PrintDocument document, ExportContext context) {
        ExcelFile file = new ExcelFile(document.title(), context);
        file.heading(document.title(), document.stamp());
        file.fields(document.party());
        file.fields(document.details());
        file.rowIndex++;
        int lastColumn = file.table(document.lines(), false);
        if (!document.summary().isEmpty()) {
            file.rowIndex++;
            file.summary(document.summary(), Math.max(lastColumn, 1));
        }
        if (!document.notes().isEmpty()) {
            file.rowIndex++;
            file.fields(document.notes());
        }
        return file.finish();
    }

    private void heading(String title, String stamp) {
        text(row(), 0, context.companyName(), style("company"));
        for (String line : context.companyLines()) {
            text(row(), 0, line, style("muted"));
        }
        rowIndex++;
        text(row(), 0, title, style("title"));
        if (stamp != null) {
            text(row(), 0, stamp, style("stamp"));
        }
        text(row(), 0, context.printedLine(), style("muted"));
    }

    // Label in the first column, value in the second
    private void fields(List<Field> fields) {
        for (Field field : fields) {
            Row row = row();
            track(0, field.label());
            text(row, 0, field.label(), style("label"));
            if (field.format() == CellFormat.AMOUNT && field.value() instanceof Number number) {
                Cell cell = row.createCell(1);
                cell.setCellValue(number.doubleValue());
                cell.setCellStyle(style("amount"));
            } else {
                text(row, 1, context.text(field.value(), field.format()), style("text"));
            }
        }
    }

    // The header row, the rows and the totals row; returns the index of the last column
    private int table(ExportTable table, boolean filter) {
        int headerRow = rowIndex;
        Row header = row();
        int column = 0;
        if (table.numbered()) {
            track(column, "S.N");
            text(header, column++, "S.N", style("header"));
        }
        for (ExportTable.Column each : table.columns()) {
            track(column, each.header());
            text(header, column++, each.header(),
                    style(isFigure(each.format()) ? "header-right" : "header"));
        }
        int last = column - 1;

        List<List<Object>> rows = table.rows();
        for (int r = 0; r < rows.size(); r++) {
            Row row = row();
            column = 0;
            if (table.numbered()) {
                value(row, column++, r + 1, CellFormat.NUMBER, false);
            }
            for (int c = 0; c < table.columns().size(); c++) {
                value(row, column++, rows.get(r).get(c), table.columns().get(c).format(), false);
            }
        }
        if (rows.isEmpty()) {
            text(row(), 0, "No records.", style("muted"));
        }
        if (table.hasTotals()) {
            Row row = row();
            column = table.numbered() ? 1 : 0;
            if (table.numbered()) {
                text(row, 0, "", style("text-total"));
            }
            List<Object> totals = table.totals();
            for (int c = 0; c < totals.size(); c++) {
                ExportTable.Column each = table.columns().get(c);
                value(row, column++, totals.get(c), each.inTotals() ? each.format() : CellFormat.TEXT, true);
            }
        }
        if (filter && !rows.isEmpty()) {
            sheet.setAutoFilter(new CellRangeAddress(headerRow, headerRow + rows.size(), 0, last));
            sheet.createFreezePane(0, headerRow + 1);
        }
        return last;
    }

    // Labels in the column before `column`, amounts in it; the last line (the grand total) bold
    private void summary(List<Field> fields, int column) {
        for (int i = 0; i < fields.size(); i++) {
            boolean last = i == fields.size() - 1;
            Row row = row();
            track(column - 1, fields.get(i).label());
            text(row, column - 1, fields.get(i).label(), style("label"));
            value(row, column, fields.get(i).value(), CellFormat.AMOUNT, last);
        }
    }

    private void value(Row row, int column, Object value, CellFormat format, boolean total) {
        String suffix = total ? "-total" : "";
        switch (format) {
            case AMOUNT, NUMBER -> {
                Cell cell = row.createCell(column);
                if (value instanceof Number number) {
                    cell.setCellValue(number.doubleValue());
                } else if (value != null) {
                    cell.setCellValue(value.toString());
                }
                cell.setCellStyle(style((format == CellFormat.AMOUNT ? "amount" : "number") + suffix));
                track(column, format == CellFormat.AMOUNT ? Formats.amount(value) : Formats.number(value));
            }
            case DATE -> {
                String iso = value == null ? "" : value.toString();
                if (!context.bs() && iso.matches("\\d{4}-\\d{2}-\\d{2}.*")) {
                    Cell cell = row.createCell(column);
                    cell.setCellValue(LocalDate.parse(iso.substring(0, 10)));
                    cell.setCellStyle(style("date" + suffix));
                    track(column, "0000-00-00");
                } else {
                    String text = context.date(value);
                    text(row, column, text, style("text" + suffix));
                    track(column, text);
                }
            }
            case TEXT -> {
                String text = value == null ? "" : value.toString();
                text(row, column, text, style("text" + suffix));
                track(column, text);
            }
        }
    }

    private static boolean isFigure(CellFormat format) {
        return format == CellFormat.AMOUNT || format == CellFormat.NUMBER;
    }

    private void text(Row row, int column, String text, CellStyle style) {
        Cell cell = row.createCell(column);
        if (text != null && !text.isEmpty()) {
            cell.setCellValue(text);
        }
        cell.setCellStyle(style);
    }

    private Row row() {
        return sheet.createRow(rowIndex++);
    }

    private void track(int column, String text) {
        widths.merge(column, text == null ? 0 : text.length(), Math::max);
    }

    private CellStyle style(String name) {
        return styles.computeIfAbsent(name, this::createStyle);
    }

    private CellStyle createStyle(String name) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        boolean total = name.endsWith("-total");
        String base = total ? name.substring(0, name.length() - "-total".length()) : name;
        switch (base) {
            case "company" -> {
                font.setBold(true);
                font.setFontHeightInPoints((short) 14);
            }
            case "title" -> {
                font.setBold(true);
                font.setFontHeightInPoints((short) 12);
            }
            case "stamp" -> {
                font.setBold(true);
                font.setColor(IndexedColors.RED.getIndex());
            }
            case "muted" -> font.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
            case "label" -> font.setBold(true);
            case "header", "header-right" -> {
                font.setBold(true);
                style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
                style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                style.setBorderBottom(BorderStyle.THIN);
                if (base.equals("header-right")) {
                    style.setAlignment(HorizontalAlignment.RIGHT);
                }
            }
            case "amount" -> style.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00"));
            case "number" -> style.setDataFormat(workbook.createDataFormat().getFormat("General"));
            case "date" -> {
                style.setDataFormat(workbook.createDataFormat().getFormat("yyyy-mm-dd"));
                style.setAlignment(HorizontalAlignment.LEFT);
            }
            default -> {
            }
        }
        if (total) {
            font.setBold(true);
            style.setBorderTop(BorderStyle.THIN);
        }
        style.setFont(font);
        return style;
    }

    private byte[] finish() {
        widths.forEach((column, length) -> sheet.setColumnWidth(column,
                Math.min(Math.max(length + 2, MIN_WIDTH), MAX_WIDTH) * 256));
        try (workbook; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
