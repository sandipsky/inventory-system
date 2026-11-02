package com.sandipsky.inventory_system.features.dashboard.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.features.dashboard.dtos.StockAlertsDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.StockLevelDTO;
import com.sandipsky.inventory_system.features.dashboard.services.DashboardService.Period;

class DashboardServiceTest {

    // A Monday
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 2);

    @Test
    void monthlyPeriodsAreTheLastTwelveCalendarMonths() {
        List<Period> periods = DashboardService.periods("monthly", TODAY);

        assertEquals(12, periods.size());
        assertEquals(new Period(LocalDate.of(2025, 12, 1), LocalDate.of(2025, 12, 31)), periods.getFirst());
        assertEquals(new Period(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28)), periods.get(2));
        assertEquals(new Period(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30)), periods.getLast());
    }

    @Test
    void weeklyPeriodsRunSundayToSaturday() {
        List<Period> periods = DashboardService.periods("weekly", TODAY);

        assertEquals(12, periods.size());
        assertEquals(LocalDate.of(2026, 8, 16), periods.getFirst().from());
        assertEquals(new Period(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 7)), periods.getLast());
    }

    @Test
    void dailyPeriodsAreTheLastThirtyDays() {
        List<Period> periods = DashboardService.periods("daily", TODAY);

        assertEquals(30, periods.size());
        assertEquals(new Period(LocalDate.of(2026, 10, 4), LocalDate.of(2026, 10, 4)), periods.getFirst());
        assertEquals(new Period(TODAY, TODAY), periods.getLast());
    }

    @Test
    void anUnknownIntervalIsRejected() {
        assertThrows(BadRequestException.class, () -> DashboardService.periods("yearly", TODAY));
        assertThrows(BadRequestException.class, () -> DashboardService.periods(null, TODAY));
    }

    @Test
    void stockAlertsSplitLowStockFromEmptyStock() {
        StockAlertsDTO alerts = DashboardService.stockAlerts(List.of(
                new StockLevelDTO(1, "Chair", null, 10.0, 2.0),
                new StockLevelDTO(2, "Cups", null, 0.0, null),
                new StockLevelDTO(3, "Glue", null, 0.0, 8.0),
                new StockLevelDTO(4, "Marker", null, 4.0, 5.0),
                new StockLevelDTO(5, "Pencil", null, 3.0, 5.0),
                new StockLevelDTO(6, "Ruler", null, 1.0, null)));

        assertEquals(List.of("Pencil", "Marker"),
                alerts.getMinimumStock().stream().map(StockLevelDTO::getProductName).toList());
        assertEquals(List.of("Cups", "Glue"),
                alerts.getZeroQuantity().stream().map(StockLevelDTO::getProductName).toList());
    }
}
