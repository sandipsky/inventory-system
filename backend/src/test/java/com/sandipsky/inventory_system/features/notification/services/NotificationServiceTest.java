package com.sandipsky.inventory_system.features.notification.services;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class NotificationServiceTest {

    @Test
    void documentNumbersDropTheEmptyFiscalYearPart() {
        assertEquals("PE-000001", NotificationService.docNo("|PE-000001"));
        assertEquals("2082-83 | PE-000005", NotificationService.docNo("2082-83|PE-000005"));
        assertEquals("", NotificationService.docNo(null));
    }

    @Test
    void amountsAreGroupedTheIndianWay() {
        assertEquals("Rs. 1,23,456.50", NotificationService.amount(123456.5));
        assertEquals("Rs. 12,34,567.00", NotificationService.amount(1234567));
        assertEquals("Rs. 1,234.57", NotificationService.amount(1234.567));
        assertEquals("Rs. 999.00", NotificationService.amount(999));
        assertEquals("Rs. 0.00", NotificationService.amount(0));
    }

    @Test
    void quantitiesDropTrailingZeros() {
        assertEquals("8", NotificationService.quantity(8.0));
        assertEquals("2.5", NotificationService.quantity(2.50));
    }

    @Test
    void documentMessagesNameTheNumberPartyAndTotal() {
        assertEquals("SI-000045 to Everest Mart, Rs. 12,000.00.",
                NotificationService.documentMessage("|SI-000045", "to Everest Mart", 12000));
    }

    @Test
    void paymentsNotifyWhoMayViewTheirPartyType() {
        assertEquals(NotificationType.VENDOR_PAYMENT, NotificationType.payment("Vendor"));
        assertEquals(NotificationType.CUSTOMER_PAYMENT, NotificationType.payment("Customer"));
        assertEquals("ViewCustomerPayment", NotificationType.payment("Customer").operation());
    }
}
