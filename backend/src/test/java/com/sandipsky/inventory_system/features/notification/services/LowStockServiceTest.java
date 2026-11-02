package com.sandipsky.inventory_system.features.notification.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import com.sandipsky.inventory_system.features.notification.services.LowStockService.StockAlert;

class LowStockServiceTest {

    @Test
    void aBlankOrInvalidSettingTurnsAlertsOff() {
        assertNull(LowStockService.threshold(null));
        assertNull(LowStockService.threshold(" "));
        assertNull(LowStockService.threshold("ten"));
        assertNull(LowStockService.threshold("-1"));
        assertNull(LowStockService.threshold("NaN"));
        assertEquals(0.0, LowStockService.threshold("0"));
        assertEquals(12.5, LowStockService.threshold(" 12.5 "));
    }

    @Test
    void stockAboveTheThresholdRaisesNoAlert() {
        assertNull(LowStockService.stockAlert(1, "Pencil", "Pcs", 10.5, 10));
    }

    @Test
    void stockAtOrBelowTheThresholdIsLow() {
        StockAlert alert = LowStockService.stockAlert(1, "Pencil", "Pcs", 10, 10);

        assertEquals(NotificationType.LOW_STOCK, alert.type());
        assertEquals("Low stock", alert.title());
        assertEquals("Pencil is down to 10 Pcs, at or below the low stock quantity of 10.", alert.message());
        assertEquals("Glue is down to 2.5, at or below the low stock quantity of 10.",
                LowStockService.stockAlert(2, "Glue", null, 2.5, 10).message());
    }

    @Test
    void emptyStockIsOutOfStockWhateverTheThreshold() {
        StockAlert alert = LowStockService.stockAlert(1, "Pencil", "Pcs", 0, 0);

        assertEquals(NotificationType.OUT_OF_STOCK, alert.type());
        assertEquals("Pencil has no stock left.", alert.message());
    }
}
