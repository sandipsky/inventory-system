package com.sandipsky.inventory_system.features.reports.export;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import com.sandipsky.inventory_system.common.export.DocumentParts;

// The columns of each report, as the web app's report.model.ts lays them out
public class ReportColumns {

    public enum Party {
        VENDOR("vendor", "Vendor"), CUSTOMER("customer", "Customer");

        private final String key;
        private final String label;

        Party(String key, String label) {
            this.key = key;
            this.label = label;
        }
    }

    private ReportColumns() {
    }

    // A register: one row per document
    public static List<ReportColumn> register(Party party) {
        List<ReportColumn> columns = new ArrayList<>();
        columns.add(ReportColumn.date("date", "Date"));
        columns.add(ReportColumn.docNo("system_entry_no", "Entry No"));
        if (party == Party.VENDOR) {
            columns.add(ReportColumn.text("bill_no", "Bill No"));
        }
        columns.add(ReportColumn.text(party.key + "_name", party.label));
        columns.add(ReportColumn.text("transaction_type", "Type"));
        columns.add(ReportColumn.amount("sub_total", "Gross Amt.").totalled());
        columns.add(ReportColumn.amount("discount", "Discount").totalled().derived(ReportColumns::discountAmount));
        columns.add(ReportColumn.amount("non_taxable_amount", "Non-Taxable").totalled());
        columns.add(ReportColumn.amount("taxable_amount", "Taxable").totalled());
        columns.add(ReportColumn.amount("total_tax", "Tax").totalled());
        columns.add(ReportColumn.amount("grand_total", "Net Amt.").totalled());
        return columns;
    }

    // One party's documents added up
    public static List<ReportColumn> party(Party party) {
        return List.of(
                ReportColumn.text(party.key + "_name", party.label),
                ReportColumn.number("entry_count", "Entries").totalled(),
                ReportColumn.amount("sub_total", "Gross Amt.").totalled(),
                ReportColumn.amount("total_tax", "Tax").totalled(),
                ReportColumn.amount("grand_total", "Net Amt.").totalled());
    }

    public static final List<ReportColumn> PRODUCT = List.of(
            ReportColumn.text("product_name", "Product"),
            ReportColumn.number("quantity", "Quantity"),
            ReportColumn.amount("amount", "Amount").totalled());

    public static final List<ReportColumn> BATCH = List.of(
            ReportColumn.text("product_name", "Product"),
            ReportColumn.batch("batch_no", "Batch"),
            ReportColumn.date("expiry_date", "Expiry Date"),
            ReportColumn.number("quantity", "Quantity"),
            ReportColumn.amount("amount", "Amount").totalled());

    public static final List<ReportColumn> STOCK = List.of(
            ReportColumn.text("product_name", "Product"),
            ReportColumn.batch("batch_no", "Batch"),
            ReportColumn.date("expiry_date", "Expiry Date"),
            ReportColumn.number("quantity", "In Stock"),
            ReportColumn.amount("cost_price", "Cost Price"),
            ReportColumn.amount("selling_price", "Selling Price"),
            ReportColumn.amount("mrp", "MRP"),
            ReportColumn.amount("stock_value", "Stock Value").totalled());

    public static final List<ReportColumn> JOURNAL = List.of(
            ReportColumn.date("date", "Date"),
            ReportColumn.docNo("system_entry_no", "Entry No"),
            ReportColumn.text("account_name", "Account"),
            ReportColumn.text("narration", "Narration"),
            ReportColumn.amount("debit_amount", "Debit").totalled(),
            ReportColumn.amount("credit_amount", "Credit").totalled());

    public static final List<ReportColumn> TRIAL_BALANCE = List.of(
            ReportColumn.text("account_code", "Code"),
            ReportColumn.text("account_name", "Account"),
            ReportColumn.text("account_type", "Account Type"),
            ReportColumn.amount("total_debit", "Total Debit").totalled(),
            ReportColumn.amount("total_credit", "Total Credit").totalled(),
            ReportColumn.amount("debit_balance", "Debit Balance").totalled(),
            ReportColumn.amount("credit_balance", "Credit Balance").totalled());

    // Invoices with money still due, receivable or payable
    public static List<ReportColumn> outstanding(Party party) {
        return List.of(
                ReportColumn.text("party_name", party.label),
                ReportColumn.date("invoice_date", "Invoice Date"),
                ReportColumn.docNo("invoice_number", "Invoice No"),
                ReportColumn.amount("total_invoice_amount", "Invoice Amt.").totalled(),
                ReportColumn.amount("paid_amount", "Paid").totalled(),
                ReportColumn.amount("due_amount", "Due").totalled());
    }

    // `discount` is what was typed (a percent or an amount), so the amount is derived
    private static Object discountAmount(Map<String, Object> row) {
        return DocumentParts.discountAmount(number(row, "sub_total"), number(row, "taxable_amount"),
                number(row, "non_taxable_amount"));
    }

    private static double number(Map<String, Object> row, String key) {
        return row.get(key) instanceof Number number ? number.doubleValue() : 0;
    }
}
