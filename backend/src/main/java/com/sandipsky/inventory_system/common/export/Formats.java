package com.sandipsky.inventory_system.common.export;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

import com.sandipsky.inventory_system.common.util.MoneyUtil;

// Values written the way the web app shows them
public class Formats {

    private Formats() {
    }

    // Two decimals with Indian grouping, like the app's amount pipe: 1,23,456.50
    public static String amount(Object value) {
        if (!(value instanceof Number number)) {
            return "";
        }
        String plain = String.format(Locale.ROOT, "%.2f", MoneyUtil.round2(number.doubleValue()));
        boolean negative = plain.startsWith("-");
        String digits = negative ? plain.substring(1) : plain;
        int point = digits.indexOf('.');
        String whole = digits.substring(0, point);
        StringBuilder grouped = new StringBuilder();
        if (whole.length() > 3) {
            String head = whole.substring(0, whole.length() - 3);
            for (int i = 0; i < head.length(); i++) {
                if (i > 0 && (head.length() - i) % 2 == 0) {
                    grouped.append(',');
                }
                grouped.append(head.charAt(i));
            }
            grouped.append(',').append(whole.substring(whole.length() - 3));
        } else {
            grouped.append(whole);
        }
        return (negative ? "-" : "") + grouped + digits.substring(point);
    }

    // Quantities and counts without trailing zeros: 10.0 -> 10, 2.50 -> 2.5
    public static String number(Object value) {
        if (!(value instanceof Number number)) {
            return value == null ? "" : value.toString();
        }
        return BigDecimal.valueOf(number.doubleValue()).stripTrailingZeros().toPlainString();
    }

    // `2082-83|PE-000005` as `2082-83 | PE-000005`; the empty part of `|PE-000001` is dropped
    public static String docNo(String value) {
        if (value == null) {
            return "";
        }
        return Arrays.stream(value.split("\\|"))
                .map(String::trim)
                .filter(part -> !part.isEmpty())
                .collect(Collectors.joining(" | "));
    }

    // A batch's number, or "Default batch" for the product's default one
    public static String batch(String batchNo) {
        return batchNo == null || batchNo.isBlank() ? "Default batch" : batchNo;
    }

    // Safe in a file name: `2082-83 | PE-000005` -> `2082-83-PE-000005`
    public static String fileName(String value) {
        String name = value.replaceAll("[^A-Za-z0-9_-]+", "-").replaceAll("^-+|-+$", "");
        return name.isEmpty() ? "export" : name;
    }
}
