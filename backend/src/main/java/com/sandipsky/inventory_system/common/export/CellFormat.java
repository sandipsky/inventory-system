package com.sandipsky.inventory_system.common.export;

// How a file writes a value: TEXT as is, NUMBER without trailing zeros (quantities, counts),
// AMOUNT with two decimals, DATE (an API YYYY-MM-DD date) in the file's AD or BS calendar
public enum CellFormat {
    TEXT, NUMBER, AMOUNT, DATE
}
