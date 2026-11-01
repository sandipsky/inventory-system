/** How a document's `discount` is read: a percent of the gross, or a flat amount. */
export type DiscountType = 'Percentage' | 'Flat';

/** Totals of a purchase, sale or return. The API stores these as sent, so the app computes them. */
export interface InvoiceSummary {
  /** Sum of quantity × rate, before discount (`sub_total`). */
  gross: number;
  discountAmount: number;
  /** Lines with no tax rate, after discount. */
  nonTaxable: number;
  /** Lines with a tax rate, after discount. */
  taxable: number;
  tax: number;
  /** Added to reach a whole amount when rounding is on; can be negative. */
  rounding: number;
  /** `grand_total`: taxable + non-taxable + tax + rounding. */
  net: number;
}

/** What the totals need from one line. */
export interface InvoiceLineAmount {
  /** Quantity × rate. */
  amount: number;
  /** Percent, e.g. `13`; `0` for a non-taxable product. */
  taxRate: number;
}
