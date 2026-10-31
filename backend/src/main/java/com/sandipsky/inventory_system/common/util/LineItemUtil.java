package com.sandipsky.inventory_system.common.util;

import com.sandipsky.inventory_system.common.exception.BadRequestException;

import java.util.List;
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
}
