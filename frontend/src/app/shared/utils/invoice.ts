import { DiscountType, InvoiceLineAmount, InvoiceSummary } from '../models/invoice.model';

/** Rounds to 2 decimal places (paisa), half up. */
export function round2(value: number): number {
  // toPrecision drops the binary noise first: 12.935 * 100 is 1293.4999…, which would round to 12.93.
  return Math.round(Number((value * 100).toPrecision(15))) / 100;
}

/** A line's amount: quantity × rate, blanks counting as 0. */
export function lineAmount(quantity: number | null | undefined, rate: number | null | undefined): number {
  return round2((quantity ?? 0) * (rate ?? 0));
}

/**
 * Document totals. The discount is spread over the lines in proportion to their
 * amount, so it lowers the taxable and non-taxable parts alike, and tax is charged
 * on the discounted taxable amount. The result balances the way the backend posts
 * the journal: `net = taxable + nonTaxable + tax + rounding`.
 */
export function calculateInvoice(
  lines: readonly InvoiceLineAmount[],
  discountType: DiscountType,
  discount: number,
  rounded: boolean,
): InvoiceSummary {
  const gross = round2(lines.reduce((sum, line) => sum + line.amount, 0));
  const requested = discountType === 'Percentage' ? (gross * discount) / 100 : discount;
  const discountAmount = round2(Math.min(Math.max(requested, 0), gross));
  const factor = gross > 0 ? (gross - discountAmount) / gross : 0;

  let taxable = 0;
  let nonTaxable = 0;
  let tax = 0;
  for (const line of lines) {
    const amount = line.amount * factor;
    if (line.taxRate > 0) {
      taxable += amount;
      tax += (amount * line.taxRate) / 100;
    } else {
      nonTaxable += amount;
    }
  }

  taxable = round2(taxable);
  nonTaxable = round2(nonTaxable);
  tax = round2(tax);
  const total = round2(taxable + nonTaxable + tax);
  const rounding = rounded ? round2(Math.round(total) - total) : 0;

  return { gross, discountAmount, taxable, nonTaxable, tax, rounding, net: round2(total + rounding) };
}
