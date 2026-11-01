import { OutstandingInvoice, PaymentDetail } from './payment.model';
import { autoSettle, settledRows, settledTotal, settlementRows, toPaymentDetails } from './settlement';

function invoice(number: string, date: string, total: number, paid: number): OutstandingInvoice {
  return {
    party_type: 'Vendor',
    party_id: 1,
    party_name: 'ABC Suppliers',
    invoice_number: number,
    invoice_date: date,
    total_invoice_amount: total,
    paid_amount: paid,
    due_amount: total - paid,
  };
}

function detail(number: string, date: string, total: number, paid: number): PaymentDetail {
  return { invoice_number: number, invoice_date: date, total_invoice_amount: total, due_amount: 0, paid_amount: paid };
}

describe('settlement', () => {
  it('lists the invoices due, oldest first, settling nothing yet', () => {
    const rows = settlementRows([invoice('|PE-2', '2026-10-05', 500, 100), invoice('|PE-1', '2026-10-01', 1000, 0)]);
    expect(rows.map(row => [row.invoice_number, row.due_amount, row.paid.value])).toEqual([
      ['|PE-1', 1000, null],
      ['|PE-2', 400, null],
    ]);
  });

  it("counts the edited payment's own settlements as available again", () => {
    const rows = settlementRows(
      [invoice('|PE-1', '2026-10-01', 1000, 600)],
      // Settled 600 on PE-1 (part when saved, part by an adjustment) and all of PE-0.
      [detail('|PE-1', '2026-10-01', 1000, 500), detail('|PE-1', '2026-10-01', 1000, 100), detail('|PE-0', '2026-09-01', 300, 300)],
    );
    expect(rows.map(row => [row.invoice_number, row.due_amount, row.paid.value])).toEqual([
      ['|PE-0', 300, 300],
      ['|PE-1', 1000, 600],
    ]);
  });

  it('caps each row at what is due', () => {
    const [row] = settlementRows([invoice('|PE-1', '2026-10-01', 1000, 0)]);
    row.paid.setValue(1000.01);
    expect(row.paid.invalid).toBe(true);
    row.paid.setValue(1000);
    expect(row.paid.valid).toBe(true);
  });

  it('settles oldest first while the amount lasts', () => {
    const rows = settlementRows([invoice('|PE-1', '2026-10-01', 1000, 0), invoice('|PE-2', '2026-10-05', 500, 100)]);
    autoSettle(rows, 1200.5);
    expect(rows.map(row => row.paid.value)).toEqual([1000, 200.5]);
    expect(settledTotal(rows)).toBe(1200.5);

    autoSettle(rows, 300);
    expect(rows.map(row => row.paid.value)).toEqual([300, null]);
  });

  it('sends only the settled rows, with what stays due', () => {
    const rows = settlementRows([invoice('|PE-1', '2026-10-01', 1000, 0), invoice('|PE-2', '2026-10-05', 500, 100)]);
    rows[1].paid.setValue(150);
    expect(toPaymentDetails(rows)).toEqual([
      { invoice_number: '|PE-2', invoice_date: '2026-10-05', total_invoice_amount: 500, due_amount: 250, paid_amount: 150 },
    ]);
  });

  it('shows a saved payment by what it settled', () => {
    const rows = settledRows([detail('|PE-1', '2026-10-01', 1000, 600)]);
    expect(rows.map(row => [row.invoice_number, row.paid.value])).toEqual([['|PE-1', 600]]);
  });
});
