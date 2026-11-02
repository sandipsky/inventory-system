package com.sandipsky.inventory_system.common.export;

import java.util.List;

import com.sandipsky.inventory_system.features.product.entities.Product;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;

// A product line of a purchase, sale or return as its print and export show it. `rate` is the
// cost price on the purchase side and the selling price on the sales side.
public record InvoiceLine(String product, String code, String unit, String batchNo, String expiryDate,
        Double taxRate, Double quantity, Double rate, Double mrp, Double sellingPrice) {

    public static InvoiceLine of(Product product, ProductStock batch, Double quantity, Double rate, Double mrp,
            Double sellingPrice) {
        return new InvoiceLine(
                product.getName(),
                product.getCode(),
                product.getUnit() != null ? product.getUnit().getName() : null,
                batch != null ? batch.getBatchNo() : null,
                batch != null ? batch.getExpiryDate() : null,
                product.getTaxType() != null ? product.getTaxType().getTaxRate() : null,
                quantity, rate, mrp, sellingPrice);
    }

    public double amount() {
        return DocumentParts.lineAmount(quantity, rate);
    }

    // Product, code, unit, batch, expiry, tax, quantity, rate, MRP, the selling price on purchases
    // (they set it), and the amount
    public static ExportTable table(List<InvoiceLine> lines, boolean withSellingPrice) {
        ExportTable.Builder<InvoiceLine> table = ExportTable.<InvoiceLine>of("Items")
                .text("Product", InvoiceLine::product)
                .text("Code", InvoiceLine::code)
                .text("Unit", InvoiceLine::unit)
                .text("Batch No.", InvoiceLine::batchNo)
                .date("Expiry Date", InvoiceLine::expiryDate)
                .text("Tax", line -> DocumentParts.taxLabel(line.taxRate()))
                .number("Qty", InvoiceLine::quantity)
                .amount("Rate", InvoiceLine::rate)
                .amount("MRP", InvoiceLine::mrp);
        if (withSellingPrice) {
            table.amount("SP", InvoiceLine::sellingPrice);
        }
        return table.amount("Amount", InvoiceLine::amount).build(lines);
    }
}
