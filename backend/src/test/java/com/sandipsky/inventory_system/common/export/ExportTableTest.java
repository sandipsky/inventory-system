package com.sandipsky.inventory_system.common.export;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;

class ExportTableTest {

    private record Sale(String number, double amount, boolean cancelled) {
    }

    private static final List<Sale> SALES = List.of(
            new Sale("SI-1", 100.1, false), new Sale("SI-2", 50, true), new Sale("SI-3", 0.2, false));

    @Test
    void totalsLeaveCancelledRowsOutAndLabelTheFirstOtherColumn() {
        ExportTable table = ExportTable.<Sale>of("Sales")
                .cancelledWhen(Sale::cancelled)
                .text("Number", Sale::number)
                .amount("Amount", Sale::amount).total()
                .text("Status", sale -> sale.cancelled() ? "Cancelled" : "")
                .build(SALES);

        assertTrue(table.hasTotals());
        assertTrue(table.isCancelled(1));
        assertEquals(Arrays.asList("Total", 100.3, null), table.totals());
    }

    @Test
    void aFixedTotalShowsAsGiven() {
        ExportTable table = ExportTable.<Sale>of("Ledger")
                .text("Number", Sale::number)
                .amount("Balance", Sale::amount).totalAs(42.0)
                .build(SALES);

        assertEquals(Arrays.asList("Total", 42.0), table.totals());
    }

    @Test
    void noRowsMeansNoTotalsAndBlankDetailsAreLeftOut() {
        ExportTable table = ExportTable.<Sale>of("Sales")
                .period(null, "2026-11-02")
                .amount("Amount", Sale::amount).total()
                .build(List.of());

        assertFalse(table.hasTotals());
        assertEquals(List.of(Field.date("To", "2026-11-02")), table.details());
    }
}
