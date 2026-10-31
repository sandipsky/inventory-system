package com.sandipsky.inventory_system.common.util;

import com.sandipsky.inventory_system.common.exception.BadRequestException;

public class ReportDateUtil {

    // "AD" (Gregorian) is the only supported calendar for now; "BS" (Bikram Sambat)
    // is reserved for later — reject it explicitly instead of returning wrong data.
    public static void validateDateType(String dateType) {
        if (dateType == null || dateType.isEmpty() || dateType.equals("AD")) {
            return;
        }
        if (dateType.equals("BS")) {
            throw new BadRequestException("BS dates are not supported yet. Use dateType=AD");
        }
        throw new BadRequestException("dateType must be either AD or BS");
    }
}
