package com.sandipsky.inventory_system.common.export;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import com.sandipsky.inventory_system.common.util.BsDateUtil;

// What every file shares: the company letterhead, the calendar its dates are written in, and who
// made it when
public record ExportContext(String companyName, List<String> companyLines, boolean bs, String printedBy,
        LocalDateTime printedAt) {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    // An API date (YYYY-MM-DD) in the file's calendar; one the BS table doesn't cover stays AD
    public String date(Object value) {
        if (value == null || value.toString().isBlank()) {
            return "";
        }
        String iso = value.toString();
        if (!bs) {
            return iso;
        }
        String converted = BsDateUtil.toBs(iso);
        return converted != null ? converted : iso;
    }

    public String today() {
        return date(printedAt.toLocalDate().toString());
    }

    public String calendarName() {
        return bs ? "BS" : "AD";
    }

    // A value as text, as the PDF shows it
    public String text(Object value, CellFormat format) {
        return switch (format) {
            case AMOUNT -> Formats.amount(value);
            case NUMBER -> Formats.number(value);
            case DATE -> date(value);
            case TEXT -> value == null ? "" : value.toString();
        };
    }

    // "Printed by admin on 2083-07-16 10:30 (BS)"
    public String printedLine() {
        return "Printed by " + printedBy + " on " + today() + " " + printedAt.format(TIME) + " (" + calendarName() + ")";
    }
}
