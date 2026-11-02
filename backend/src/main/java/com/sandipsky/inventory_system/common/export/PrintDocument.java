package com.sandipsky.inventory_system.common.export;

import java.util.List;

// One document as printed: its title, the party box and the details box, the line table, the
// summary (totals, the last one the grand total) and notes such as remarks. `number` names the
// file; `stamp` marks the whole document, e.g. CANCELLED.
public record PrintDocument(
        String title,
        String number,
        String stamp,
        List<Field> party,
        List<Field> details,
        ExportTable lines,
        List<Field> summary,
        List<Field> notes) {
}
