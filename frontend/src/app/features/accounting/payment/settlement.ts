import { FormControl, Validators } from '@angular/forms';
import { round2 } from '../../../shared/utils/invoice';
import { OutstandingInvoice, PaymentDetail } from './payment.model';

/** One invoice a payment can settle, with what this payment settles of it. */
export interface SettlementRow {
  invoice_number: string;
  invoice_date: string | null;
  total_invoice_amount: number;
  /** The most this payment can settle: what is due, plus what this payment already settled. */
  due_amount: number;
  /** What this payment settles; blank for nothing. */
  paid: FormControl<number | null>;
}

/**
 * The rows for a party's invoices. `saved` are the settlements of the payment being edited,
 * which the outstanding figures already take off; an invoice they settled in full is no longer
 * outstanding, so it comes from them alone.
 */
export function settlementRows(outstanding: readonly OutstandingInvoice[], saved: readonly PaymentDetail[] = []): SettlementRow[] {
  const own = savedByInvoice(saved);
  const rows = outstanding.map(invoice => {
    const paid = own.get(invoice.invoice_number)?.paid_amount ?? 0;
    own.delete(invoice.invoice_number);
    return settlementRow({ ...invoice, due_amount: round2(invoice.due_amount + paid), paid });
  });
  for (const detail of own.values()) {
    rows.push(settlementRow({ ...detail, due_amount: detail.paid_amount, paid: detail.paid_amount }));
  }
  return rows.sort(
    (a, b) => (a.invoice_date ?? '').localeCompare(b.invoice_date ?? '') || a.invoice_number.localeCompare(b.invoice_number),
  );
}

/** Read-only rows of what a saved payment settled. */
export function settledRows(saved: readonly PaymentDetail[]): SettlementRow[] {
  return settlementRows([], saved);
}

/** The total the rows settle. */
export function settledTotal(rows: readonly SettlementRow[]): number {
  return round2(rows.reduce((sum, row) => sum + (row.paid.value ?? 0), 0));
}

/** Spreads `amount` over the rows, oldest invoice first, settling each in full while it lasts. */
export function autoSettle(rows: readonly SettlementRow[], amount: number) {
  let left = round2(Math.max(amount, 0));
  for (const row of rows) {
    const paid = round2(Math.min(row.due_amount, left));
    row.paid.setValue(paid || null);
    left = round2(left - paid);
  }
}

/** The settled rows as the API takes them. */
export function toPaymentDetails(rows: readonly SettlementRow[]): PaymentDetail[] {
  return rows
    .filter(row => (row.paid.value ?? 0) > 0)
    .map(row => ({
      invoice_number: row.invoice_number,
      invoice_date: row.invoice_date,
      total_invoice_amount: row.total_invoice_amount,
      due_amount: round2(row.due_amount - (row.paid.value ?? 0)),
      paid_amount: row.paid.value ?? 0,
    }));
}

function settlementRow(row: Omit<SettlementRow, 'paid'> & { paid: number }): SettlementRow {
  return {
    invoice_number: row.invoice_number,
    invoice_date: row.invoice_date,
    total_invoice_amount: row.total_invoice_amount,
    due_amount: row.due_amount,
    paid: new FormControl<number | null>(row.paid || null, [Validators.min(0), Validators.max(row.due_amount)]),
  };
}

/** A payment adjusted later settles an invoice again, so the details can name it twice. */
function savedByInvoice(saved: readonly PaymentDetail[]): Map<string, PaymentDetail> {
  const byInvoice = new Map<string, PaymentDetail>();
  for (const detail of saved) {
    const seen = byInvoice.get(detail.invoice_number);
    byInvoice.set(
      detail.invoice_number,
      seen ? { ...seen, paid_amount: round2(seen.paid_amount + detail.paid_amount) } : { ...detail },
    );
  }
  return byInvoice;
}
