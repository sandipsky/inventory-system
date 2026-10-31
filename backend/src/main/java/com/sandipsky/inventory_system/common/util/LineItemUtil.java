package com.sandipsky.inventory_system.common.util;

import com.sandipsky.inventory_system.common.exception.BadRequestException;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

public class LineItemUtil {

    // Purchases, sales, returns and stock adjustments need at least one item, each with a
    // positive quantity — a zero or negative one would move stock the wrong way
    public static <T> void validateLines(List<T> lines, Function<T, Double> quantity) {
        if (lines == null || lines.isEmpty()) {
            throw new BadRequestException("Add at least one product");
        }
        for (T line : lines) {
            Double value = quantity.apply(line);
            if (value == null || value <= 0) {
                throw new BadRequestException("Quantity must be greater than zero");
            }
        }
    }

    // Each product batch may appear on one line only: two lines for the same batch would have to be
    // combined, and silently picking one line's prices would change the document's own value
    public static <T> void rejectDuplicateBatches(List<T> lines, Function<T, Object> key,
            Function<T, String> describe) {
        Set<Object> seen = new HashSet<>();
        for (T line : lines) {
            if (!seen.add(key.apply(line))) {
                throw new BadRequestException(describe.apply(line) + " is entered on more than one line");
            }
        }
    }

    // Batch numbers are compared trimmed, with blank meaning the default batch
    public static String batchKey(String batchNo) {
        return batchNo == null ? "" : batchNo.trim();
    }
}
