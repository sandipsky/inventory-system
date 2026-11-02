package com.sandipsky.inventory_system.common.export;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class FormatsTest {

    @Test
    void amountsUseIndianGroupingWithTwoDecimals() {
        assertEquals("0.00", Formats.amount(0));
        assertEquals("999.50", Formats.amount(999.5));
        assertEquals("1,000.00", Formats.amount(1000));
        assertEquals("1,23,456.79", Formats.amount(123456.789));
        assertEquals("1,00,00,000.00", Formats.amount(10000000));
        assertEquals("-12,345.00", Formats.amount(-12345));
        assertEquals("", Formats.amount(null));
    }

    @Test
    void numbersDropTrailingZeros() {
        assertEquals("10", Formats.number(10.0));
        assertEquals("2.5", Formats.number(2.50));
        assertEquals("", Formats.number(null));
    }

    @Test
    void documentNumbersAndFileNamesReadLikeTheApp() {
        assertEquals("PE-000001", Formats.docNo("|PE-000001"));
        assertEquals("2082-83 | PE-000005", Formats.docNo("2082-83|PE-000005"));
        assertEquals("2082-83-PE-000005", Formats.fileName("2082-83 | PE-000005"));
        assertEquals("Default batch", Formats.batch(null));
        assertEquals("B1", Formats.batch("B1"));
    }
}
