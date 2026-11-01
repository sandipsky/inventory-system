import { calculateInvoice, round2 } from './invoice';

describe('calculateInvoice', () => {
  it('adds tax on taxable lines only', () => {
    const summary = calculateInvoice(
      [
        { amount: 1000, taxRate: 13 },
        { amount: 500, taxRate: 0 },
      ],
      'Flat',
      0,
      false,
    );
    expect(summary).toEqual({
      gross: 1500,
      discountAmount: 0,
      taxable: 1000,
      nonTaxable: 500,
      tax: 130,
      rounding: 0,
      net: 1630,
    });
  });

  it('spreads a percentage discount over taxable and non-taxable lines', () => {
    const summary = calculateInvoice(
      [
        { amount: 240000, taxRate: 13 },
        { amount: 10000, taxRate: 0 },
      ],
      'Percentage',
      5,
      false,
    );
    expect(summary.discountAmount).toBe(12500);
    expect(summary.taxable).toBe(228000);
    expect(summary.nonTaxable).toBe(9500);
    expect(summary.tax).toBe(29640);
    expect(summary.net).toBe(267140);
  });

  it('caps a flat discount at the gross amount', () => {
    const summary = calculateInvoice([{ amount: 100, taxRate: 13 }], 'Flat', 250, false);
    expect(summary.discountAmount).toBe(100);
    expect(summary.net).toBe(0);
  });

  it('rounds the net to a whole amount when rounding is on, and balances like the journal', () => {
    const summary = calculateInvoice([{ amount: 99.5, taxRate: 13 }], 'Flat', 0, true);
    // 99.5 + 12.94 tax = 112.44 → 112
    expect(summary.tax).toBe(12.94);
    expect(summary.rounding).toBe(-0.44);
    expect(summary.net).toBe(112);
    expect(round2(summary.taxable + summary.nonTaxable + summary.tax + summary.rounding)).toBe(summary.net);
  });

  it('rounds halves up despite binary floating point', () => {
    expect(round2(12.935)).toBe(12.94);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(0.1 + 0.2 - 0.3)).toBe(0);
  });

  it('is all zeros without lines', () => {
    expect(calculateInvoice([], 'Percentage', 10, true).net).toBe(0);
  });
});
