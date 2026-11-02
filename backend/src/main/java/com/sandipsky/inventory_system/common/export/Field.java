package com.sandipsky.inventory_system.common.export;

// A labelled value in a file's heading or a document's boxes, e.g. "Bill No: 445"
public record Field(String label, Object value, CellFormat format) {

    public static Field text(String label, Object value) {
        return new Field(label, value, CellFormat.TEXT);
    }

    public static Field date(String label, String value) {
        return new Field(label, value, CellFormat.DATE);
    }

    public static Field amount(String label, Number value) {
        return new Field(label, value, CellFormat.AMOUNT);
    }

    public boolean isBlank() {
        return value == null || value.toString().isBlank();
    }
}
