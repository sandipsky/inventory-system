package com.sandipsky.inventory_system.common.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class BsDateUtilTest {

    @Test
    void convertsAdDatesLikeTheDatePickers() {
        assertEquals("2000-01-01", BsDateUtil.toBs("1943-04-14"));
        assertEquals("2082-01-01", BsDateUtil.toBs("2025-04-14"));
        assertEquals("2083-01-01", BsDateUtil.toBs("2026-04-14"));
        assertEquals("2083-07-16", BsDateUtil.toBs("2026-11-02"));
        assertEquals("2090-12-30", BsDateUtil.toBs("2034-04-13"));
    }

    @Test
    void givesNothingOutsideTheTableOrForBadInput() {
        assertNull(BsDateUtil.toBs("1943-04-13"));
        assertNull(BsDateUtil.toBs("2034-04-14"));
        assertNull(BsDateUtil.toBs("31/10/2026"));
    }
}
