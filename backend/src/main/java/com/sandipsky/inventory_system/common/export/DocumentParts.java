package com.sandipsky.inventory_system.common.export;

import java.util.ArrayList;
import java.util.List;

import com.sandipsky.inventory_system.common.util.MoneyUtil;

// Pieces the invoice-like prints share: purchases, sales and their returns
public class DocumentParts {

    private DocumentParts() {
    }

    // The party box: name, address, contact and PAN/VAT number, the blank ones left out
    public static List<Field> party(String label, String name, String address, String contact, String registration) {
        List<Field> fields = new ArrayList<>();
        fields.add(Field.text(label, name));
        addIfPresent(fields, Field.text("Address", address));
        addIfPresent(fields, Field.text("Contact", contact));
        addIfPresent(fields, Field.text("PAN/VAT No.", registration));
        return fields;
    }

    // The discount amount: `discount` holds what was typed (a percent or an amount)
    public static double discountAmount(double subTotal, double taxableAmount, double nonTaxableAmount) {
        return Math.max(MoneyUtil.round2(subTotal - taxableAmount - nonTaxableAmount), 0);
    }

    // Sub total down to the grand total; rounding only when there is any
    public static List<Field> summary(double subTotal, double discount, String discountType, double nonTaxableAmount,
            double taxableAmount, double tax, double rounding, double grandTotal) {
        List<Field> fields = new ArrayList<>();
        fields.add(Field.amount("Sub Total", subTotal));
        String percent = "Percentage".equals(discountType) && discount > 0 ? " (" + Formats.number(discount) + "%)" : "";
        fields.add(Field.amount("Discount" + percent, discountAmount(subTotal, taxableAmount, nonTaxableAmount)));
        fields.add(Field.amount("Non-Taxable Amount", nonTaxableAmount));
        fields.add(Field.amount("Taxable Amount", taxableAmount));
        fields.add(Field.amount("Tax", tax));
        if (Math.abs(rounding) >= 0.005) {
            fields.add(Field.amount("Rounding", rounding));
        }
        fields.add(Field.amount("Grand Total", grandTotal));
        return fields;
    }

    // A product's tax rate as the forms show it: 13% or -
    public static String taxLabel(Double rate) {
        return rate == null || rate == 0 ? "-" : Formats.number(rate) + "%";
    }

    // The fields that have a value, e.g. a document's details or its remarks
    public static List<Field> present(Field... fields) {
        List<Field> present = new ArrayList<>();
        for (Field field : fields) {
            addIfPresent(present, field);
        }
        return present;
    }

    public static double lineAmount(Double quantity, Double rate) {
        return MoneyUtil.round2((quantity == null ? 0 : quantity) * (rate == null ? 0 : rate));
    }

    private static void addIfPresent(List<Field> fields, Field field) {
        if (!field.isBlank()) {
            fields.add(field);
        }
    }
}
