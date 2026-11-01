package com.sandipsky.inventory_system.common.util;

// Amounts are doubles, so sums and differences pick up binary noise (1130.10 - 1000.05 is
// 130.04999999999995). Stored results are rounded to paisa and compared with half a paisa of slack.
public class MoneyUtil {

    private static final double TOLERANCE = 0.005;

    private MoneyUtil() {
    }

    public static double round2(double value) {
        return Math.round(value * 100) / 100.0;
    }

    // Whether `amount` is more than `limit`, ignoring binary noise
    public static boolean exceeds(double amount, double limit) {
        return amount - limit > TOLERANCE;
    }
}
