package com.sandipsky.inventory_system.common.export;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.stream.Collectors;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfTemplate;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;

// Writes tables and documents as A4 PDFs: the letterhead on top, and a footer on every page with
// who printed it and the page number. A wide table turns the page to landscape; several
// documents each start on a new page.
final class PdfFile {

    private static final Color INK = new Color(0x1f, 0x24, 0x2b);
    private static final Color MUTED = new Color(0x6b, 0x72, 0x80);
    private static final Color RULE = new Color(0xd5, 0xd9, 0xe0);
    private static final Color SHADE = new Color(0xf1, 0xf3, 0xf6);
    private static final Color STAMP = new Color(0xc0, 0x26, 0x26);

    private static final Font COMPANY = new Font(Font.HELVETICA, 14, Font.BOLD, INK);
    private static final Font LETTERHEAD = new Font(Font.HELVETICA, 8.5f, Font.NORMAL, MUTED);
    private static final Font TITLE = new Font(Font.HELVETICA, 12, Font.BOLD, INK);
    private static final Font STAMP_FONT = new Font(Font.HELVETICA, 11, Font.BOLD, STAMP);
    private static final Font LABEL = new Font(Font.HELVETICA, 8.5f, Font.NORMAL, MUTED);
    private static final Font VALUE = new Font(Font.HELVETICA, 8.5f, Font.BOLD, INK);
    private static final Font HEAD = new Font(Font.HELVETICA, 8, Font.BOLD, INK);
    private static final Font BODY = new Font(Font.HELVETICA, 8, Font.NORMAL, INK);
    private static final Font BODY_CANCELLED = new Font(Font.HELVETICA, 8, Font.STRIKETHRU, MUTED);
    private static final Font TOTAL = new Font(Font.HELVETICA, 8, Font.BOLD, INK);
    private static final Font SUMMARY = new Font(Font.HELVETICA, 9, Font.NORMAL, INK);
    private static final Font SUMMARY_LAST = new Font(Font.HELVETICA, 10, Font.BOLD, INK);
    private static final Font NOTE = new Font(Font.HELVETICA, 8.5f, Font.NORMAL, INK);
    private static final Font NOTE_LABEL = new Font(Font.HELVETICA, 8.5f, Font.BOLD, INK);

    // Page margins, and the width a cell needs beyond its text (padding and rule)
    private static final float MARGIN = 36;
    private static final float CELL_PADDING = 10;
    // A text column never shrinks below its longest word, up to this
    private static final float MAX_WORD = 120;

    private static final BaseFont REGULAR = baseFont(BaseFont.HELVETICA);
    private static final BaseFont BOLD = baseFont(BaseFont.HELVETICA_BOLD);

    private PdfFile() {
    }

    static byte[] table(ExportTable table, ExportContext context) {
        // Landscape when the table doesn't fit across a portrait page
        float[] natural = naturalWidths(table, context);
        Rectangle size = sum(natural) > usable(PageSize.A4) ? PageSize.A4.rotate() : PageSize.A4;
        return write(size, context, document -> {
            letterhead(document, context);
            title(document, table.title(), null);
            if (!table.details().isEmpty()) {
                Paragraph details = new Paragraph(table.details().stream()
                        .map(field -> field.label() + ": " + context.text(field.value(), field.format()))
                        .collect(Collectors.joining("     ")), LABEL);
                details.setAlignment(Element.ALIGN_CENTER);
                document.add(details);
            }
            document.add(lineTable(table, context, usable(size)));
        });
    }

    static byte[] documents(List<PrintDocument> documents, ExportContext context) {
        return write(PageSize.A4, context, document -> {
            for (int i = 0; i < documents.size(); i++) {
                if (i > 0) {
                    document.newPage();
                }
                printDocument(document, documents.get(i), context);
            }
        });
    }

    @FunctionalInterface
    private interface Content {
        void write(Document document) throws DocumentException;
    }

    private static byte[] write(Rectangle size, ExportContext context, Content content) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(size, MARGIN, MARGIN, MARGIN, 50);
        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new Footer(context.printedLine()));
            document.open();
            content.write(document);
        } catch (DocumentException e) {
            throw new IllegalStateException("Could not write the PDF", e);
        } finally {
            document.close();
        }
        return out.toByteArray();
    }

    private static void letterhead(Document document, ExportContext context) throws DocumentException {
        Paragraph name = new Paragraph(context.companyName(), COMPANY);
        name.setAlignment(Element.ALIGN_CENTER);
        document.add(name);
        for (String line : context.companyLines()) {
            Paragraph paragraph = new Paragraph(line, LETTERHEAD);
            paragraph.setAlignment(Element.ALIGN_CENTER);
            document.add(paragraph);
        }
        Paragraph rule = new Paragraph(new Chunk(new LineSeparator(0.6f, 100, RULE, Element.ALIGN_CENTER, -4)));
        rule.setSpacingAfter(4);
        document.add(rule);
    }

    private static void title(Document document, String title, String stamp) throws DocumentException {
        Paragraph paragraph = new Paragraph(title.toUpperCase(), TITLE);
        paragraph.setAlignment(Element.ALIGN_CENTER);
        paragraph.setSpacingBefore(4);
        paragraph.setSpacingAfter(stamp == null ? 6 : 2);
        document.add(paragraph);
        if (stamp != null) {
            Paragraph mark = new Paragraph(stamp, STAMP_FONT);
            mark.setAlignment(Element.ALIGN_CENTER);
            mark.setSpacingAfter(6);
            document.add(mark);
        }
    }

    private static void printDocument(Document document, PrintDocument print, ExportContext context)
            throws DocumentException {
        letterhead(document, context);
        title(document, print.title(), print.stamp());
        document.add(boxes(print, context));
        document.add(lineTable(print.lines(), context, usable(PageSize.A4)));
        if (!print.summary().isEmpty()) {
            document.add(summary(print.summary()));
        }
        for (Field note : print.notes()) {
            Paragraph paragraph = new Paragraph();
            paragraph.add(new Chunk(note.label() + ": ", NOTE_LABEL));
            paragraph.add(new Chunk(context.text(note.value(), note.format()), NOTE));
            paragraph.setSpacingBefore(6);
            document.add(paragraph);
        }
        document.add(signatures());
    }

    // The party box on the left and the details box on the right; without a party, the details
    // fill both
    private static PdfPTable boxes(PrintDocument print, ExportContext context) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingAfter(8);
        List<Field> left = print.party();
        List<Field> right = print.details();
        if (left.isEmpty()) {
            int half = (right.size() + 1) / 2;
            left = right.subList(0, half);
            right = right.subList(half, right.size());
        }
        table.addCell(box(left, context));
        table.addCell(box(right, context));
        return table;
    }

    private static PdfPCell box(List<Field> fields, ExportContext context) {
        PdfPTable inner = new PdfPTable(new float[] { 2, 5 });
        inner.setWidthPercentage(100);
        for (Field field : fields) {
            inner.addCell(plain(field.label(), LABEL, Element.ALIGN_LEFT));
            inner.addCell(plain(context.text(field.value(), field.format()), VALUE, Element.ALIGN_LEFT));
        }
        PdfPCell cell = new PdfPCell(inner);
        cell.setBorderColor(RULE);
        cell.setBorderWidth(0.6f);
        cell.setPadding(6);
        return cell;
    }

    private static PdfPTable lineTable(ExportTable table, ExportContext context, float width)
            throws DocumentException {
        List<ExportTable.Column> columns = table.columns();
        int offset = table.numbered() ? 1 : 0;
        PdfPTable pdf = new PdfPTable(columns.size() + offset);
        pdf.setWidthPercentage(100);
        pdf.setWidths(widths(table, context, width));
        pdf.setHeaderRows(1);
        pdf.setSpacingBefore(6);

        if (table.numbered()) {
            pdf.addCell(head("S.N", Element.ALIGN_LEFT));
        }
        for (ExportTable.Column column : columns) {
            pdf.addCell(head(column.header(), align(column.format())));
        }

        List<List<Object>> rows = table.rows();
        for (int r = 0; r < rows.size(); r++) {
            Font font = table.isCancelled(r) ? BODY_CANCELLED : BODY;
            if (table.numbered()) {
                pdf.addCell(body(String.valueOf(r + 1), font, Element.ALIGN_LEFT));
            }
            for (int c = 0; c < columns.size(); c++) {
                ExportTable.Column column = columns.get(c);
                pdf.addCell(body(context.text(rows.get(r).get(c), column.format()), font, align(column.format())));
            }
        }
        if (rows.isEmpty()) {
            PdfPCell empty = body("No records.", LABEL, Element.ALIGN_CENTER);
            empty.setColspan(columns.size() + offset);
            empty.setPadding(10);
            pdf.addCell(empty);
        }
        if (table.hasTotals()) {
            if (table.numbered()) {
                pdf.addCell(total("", Element.ALIGN_LEFT));
            }
            List<Object> totals = table.totals();
            for (int c = 0; c < columns.size(); c++) {
                ExportTable.Column column = columns.get(c);
                CellFormat format = column.inTotals() ? column.format() : CellFormat.TEXT;
                pdf.addCell(total(context.text(totals.get(c), format), align(format)));
            }
        }
        return pdf;
    }

    // Column widths in points for a table `width` wide: each column fits its text when there is room;
    // otherwise figures, dates and short columns keep their width, and the text columns share what
    // is left and wrap, though never narrower than their longest word
    private static float[] widths(ExportTable table, ExportContext context, float width) {
        float[] natural = naturalWidths(table, context);
        if (sum(natural) <= width) {
            return natural;
        }
        float[] min = new float[natural.length];
        int offset = table.numbered() ? 1 : 0;
        for (int c = 0; c < natural.length; c++) {
            boolean text = c >= offset && table.columns().get(c - offset).format() == CellFormat.TEXT;
            min[c] = text ? Math.min(natural[c], longestWord(table, context, c - offset) + CELL_PADDING) : natural[c];
        }
        float spare = width - sum(min);
        float stretch = sum(natural) - sum(min);
        float[] widths = new float[natural.length];
        for (int c = 0; c < natural.length; c++) {
            widths[c] = spare > 0 && stretch > 0 ? min[c] + spare * (natural[c] - min[c]) / stretch : min[c];
        }
        return widths;
    }

    // Each column as wide as its longest cell, and its header's longest word (headers may wrap)
    private static float[] naturalWidths(ExportTable table, ExportContext context) {
        int offset = table.numbered() ? 1 : 0;
        float[] widths = new float[table.columns().size() + offset];
        if (table.numbered()) {
            widths[0] = Math.max(BOLD.getWidthPoint("S.N", 8),
                    REGULAR.getWidthPoint(String.valueOf(table.rows().size()), 8)) + CELL_PADDING;
        }
        List<Object> totals = table.hasTotals() ? table.totals() : null;
        for (int c = 0; c < table.columns().size(); c++) {
            ExportTable.Column column = table.columns().get(c);
            float widest = longestWord(column.header(), BOLD);
            for (List<Object> row : table.rows()) {
                widest = Math.max(widest, REGULAR.getWidthPoint(context.text(row.get(c), column.format()), 8));
            }
            if (totals != null && totals.get(c) != null) {
                CellFormat format = column.inTotals() ? column.format() : CellFormat.TEXT;
                widest = Math.max(widest, BOLD.getWidthPoint(context.text(totals.get(c), format), 8));
            }
            widths[c + offset] = widest + CELL_PADDING;
        }
        return widths;
    }

    private static float longestWord(ExportTable table, ExportContext context, int column) {
        ExportTable.Column each = table.columns().get(column);
        float longest = longestWord(each.header(), BOLD);
        for (List<Object> row : table.rows()) {
            longest = Math.max(longest, longestWord(context.text(row.get(column), each.format()), REGULAR));
        }
        return Math.min(longest, MAX_WORD);
    }

    private static float longestWord(String text, BaseFont font) {
        float longest = 0;
        for (String word : text.split("\\s+")) {
            longest = Math.max(longest, font.getWidthPoint(word, 8));
        }
        return longest;
    }

    private static float sum(float[] widths) {
        float total = 0;
        for (float width : widths) {
            total += width;
        }
        return total;
    }

    private static float usable(Rectangle page) {
        return page.getWidth() - 2 * MARGIN;
    }

    private static BaseFont baseFont(String name) {
        try {
            return BaseFont.createFont(name, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static PdfPTable summary(List<Field> fields) {
        PdfPTable table = new PdfPTable(new float[] { 3, 2 });
        table.setWidthPercentage(42);
        table.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.setSpacingBefore(6);
        for (int i = 0; i < fields.size(); i++) {
            boolean last = i == fields.size() - 1;
            Font font = last ? SUMMARY_LAST : SUMMARY;
            PdfPCell label = plain(fields.get(i).label(), font, Element.ALIGN_LEFT);
            PdfPCell value = plain(Formats.amount(fields.get(i).value()), font, Element.ALIGN_RIGHT);
            if (last) {
                for (PdfPCell cell : List.of(label, value)) {
                    cell.setBorder(Rectangle.TOP);
                    cell.setBorderColor(INK);
                    cell.setBorderWidth(0.8f);
                    cell.setPaddingTop(4);
                }
            }
            table.addCell(label);
            table.addCell(value);
        }
        return table;
    }

    private static PdfPTable signatures() {
        PdfPTable table = new PdfPTable(new float[] { 3, 4, 3 });
        table.setWidthPercentage(100);
        table.setSpacingBefore(48);
        table.setKeepTogether(true);
        table.addCell(signature("Prepared By"));
        table.addCell(plain("", BODY, Element.ALIGN_LEFT));
        table.addCell(signature("Authorized Signature"));
        return table;
    }

    private static PdfPCell signature(String text) {
        PdfPCell cell = plain(text, LABEL, Element.ALIGN_CENTER);
        cell.setBorder(Rectangle.TOP);
        cell.setBorderColor(MUTED);
        cell.setBorderWidth(0.6f);
        cell.setPaddingTop(4);
        return cell;
    }

    private static int align(CellFormat format) {
        return format == CellFormat.AMOUNT || format == CellFormat.NUMBER ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT;
    }

    private static PdfPCell head(String text, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text, HEAD));
        cell.setHorizontalAlignment(align);
        cell.setBackgroundColor(SHADE);
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(RULE);
        cell.setPadding(4);
        return cell;
    }

    private static PdfPCell body(String text, Font font, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(align);
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(RULE);
        cell.setBorderWidth(0.5f);
        cell.setPadding(3.5f);
        return cell;
    }

    private static PdfPCell total(String text, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text, TOTAL));
        cell.setHorizontalAlignment(align);
        cell.setBackgroundColor(SHADE);
        cell.setBorder(Rectangle.TOP);
        cell.setBorderColor(INK);
        cell.setBorderWidth(0.6f);
        cell.setPadding(4);
        return cell;
    }

    private static PdfPCell plain(String text, Font font, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(align);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(2);
        return cell;
    }

    // "Printed by … " on the left, "Page 2 of 5" on the right; the total is filled in at the end
    private static final class Footer extends PdfPageEventHelper {
        private static final float SIZE = 7.5f;
        private static final float TOTAL_WIDTH = 16;

        private final String text;
        private final BaseFont font = REGULAR;
        private PdfTemplate total;

        Footer(String text) {
            this.text = text;
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            total = writer.getDirectContent().createTemplate(TOTAL_WIDTH, SIZE + 2);
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte canvas = writer.getDirectContent();
            float y = document.bottom() - 24;
            float right = document.right() - TOTAL_WIDTH;
            canvas.saveState();
            canvas.beginText();
            canvas.setFontAndSize(font, SIZE);
            canvas.setColorFill(MUTED);
            canvas.showTextAligned(Element.ALIGN_LEFT, text, document.left(), y, 0);
            canvas.showTextAligned(Element.ALIGN_RIGHT, "Page " + writer.getPageNumber() + " of ", right, y, 0);
            canvas.endText();
            canvas.addTemplate(total, right, y);
            canvas.restoreState();
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            total.beginText();
            total.setFontAndSize(font, SIZE);
            total.setColorFill(MUTED);
            total.showText(String.valueOf(writer.getPageNumber() - 1));
            total.endText();
        }
    }
}
