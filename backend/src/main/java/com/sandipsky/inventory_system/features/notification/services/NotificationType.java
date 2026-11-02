package com.sandipsky.inventory_system.features.notification.services;

// What a notification is about, and the operation a user's role needs to receive it
public enum NotificationType {
    PURCHASE_ENTRY("purchase_entry", "ViewPurchaseEntry"),
    PURCHASE_RETURN("purchase_return", "ViewPurchaseReturn"),
    SALES_ENTRY("sales_entry", "ViewSalesEntries"),
    SALES_RETURN("sales_return", "ViewSalesReturns"),
    VENDOR_PAYMENT("vendor_payment", "ViewVendorPayment"),
    CUSTOMER_PAYMENT("customer_payment", "ViewCustomerPayment"),
    STOCK_ADJUSTMENT("stock_adjustment", "ViewStockAdjustment"),
    LOW_STOCK("low_stock", "ViewStockEdit"),
    OUT_OF_STOCK("out_of_stock", "ViewStockEdit");

    private final String code;
    private final String operation;

    NotificationType(String code, String operation) {
        this.code = code;
        this.operation = operation;
    }

    // Stored in notification.type and sent to the client
    public String code() {
        return code;
    }

    public String operation() {
        return operation;
    }

    public static NotificationType payment(String partyType) {
        return "Vendor".equals(partyType) ? VENDOR_PAYMENT : CUSTOMER_PAYMENT;
    }
}
