import { ReportColumn, discountAmount } from './report.model';
import {
  balanceSide,
  columnTotals,
  csvValue,
  reportFileName,
  reportRange,
  searchRows,
  sortRows,
  startOfMonth,
} from './report-table';

const COLUMNS: ReportColumn[] = [
  { key: 'date', header: 'Date', format: 'date' },
  { key: 'system_entry_no', header: 'Entry No', format: 'docNo' },
  { key: 'customer_name', header: 'Customer' },
  { key: 'discount', header: 'Discount', format: 'amount', total: true, value: discountAmount },
  { key: 'grand_total', header: 'Net Amt.', format: 'amount', total: true },
];

const SALE = (id: number, customer_name: string | null, grand_total: number, is_cancelled = false) => ({
  id,
  date: '2026-10-31',
  system_entry_no: `|SI-00000${id}`,
  customer_name,
  sub_total: 100,
  taxable_amount: 90,
  non_taxable_amount: 0,
  grand_total,
  is_cancelled,
});

const NOV_2 = new Date(2026, 10, 2);

describe('searchRows', () => {
  const rows = [SALE(1, 'Ram Traders', 113), SALE(2, 'Hari Stores', 226)];

  it('matches text cells, ignoring case', () => {
    expect(searchRows(rows, COLUMNS, 'hari').map(row => row['id'])).toEqual([2]);
  });

  it('matches document numbers as they are shown, without the leading bar', () => {
    expect(searchRows(rows, COLUMNS, 'SI-000001').map(row => row['id'])).toEqual([1]);
  });

  it('leaves figures and dates out of the search', () => {
    expect(searchRows(rows, COLUMNS, '226')).toEqual([]);
    expect(searchRows(rows, COLUMNS, '2026')).toEqual([]);
  });

  it('keeps every row for a blank query', () => {
    expect(searchRows(rows, COLUMNS, '  ')).toBe(rows);
  });
});

describe('sortRows', () => {
  const rows = [SALE(2, 'Hari Stores', 226), SALE(10, null, 50), SALE(1, 'Ram Traders', 113)];
  const ids = (sorted: Record<string, unknown>[]) => sorted.map(row => row['id']);

  it('sorts numbers by size', () => {
    expect(ids(sortRows(rows, COLUMNS, { key: 'grand_total', direction: 'desc' }))).toEqual([2, 1, 10]);
  });

  it('sorts text naturally and puts blanks last either way', () => {
    expect(ids(sortRows(rows, COLUMNS, { key: 'customer_name', direction: 'asc' }))).toEqual([2, 1, 10]);
    expect(ids(sortRows(rows, COLUMNS, { key: 'customer_name', direction: 'desc' }))).toEqual([1, 2, 10]);
    expect(ids(sortRows(rows, COLUMNS, { key: 'system_entry_no', direction: 'asc' }))).toEqual([1, 2, 10]);
  });

  it('sorts a derived column by what it derives', () => {
    const discounted = { ...SALE(3, 'Sita', 80), taxable_amount: 70 };
    expect(ids(sortRows([...rows, discounted], COLUMNS, { key: 'discount', direction: 'desc' }))[0]).toBe(3);
  });

  it('keeps the API order without a sort', () => {
    expect(sortRows(rows, COLUMNS, null)).toBe(rows);
  });
});

describe('columnTotals', () => {
  it('adds up the total columns, derived ones by what they derive', () => {
    expect(columnTotals([SALE(1, 'Ram', 113), SALE(2, 'Hari', 226.1)], COLUMNS)).toEqual({
      discount: 20,
      grand_total: 339.1,
    });
  });

  it('leaves cancelled documents out, as the API does', () => {
    expect(columnTotals([SALE(1, 'Ram', 113), SALE(2, 'Hari', 226, true)], COLUMNS)).toEqual({
      discount: 10,
      grand_total: 113,
    });
  });
});

describe('csvValue', () => {
  const row = SALE(1, null, 112.999);

  it('writes document numbers as shown, figures to two decimals and blanks as empty', () => {
    expect(COLUMNS.map(column => csvValue(row, column))).toEqual(['2026-10-31', 'SI-000001', null, 10, 113]);
  });

  it('names the default batch', () => {
    expect(csvValue({ batch_no: null }, { key: 'batch_no', header: 'Batch', format: 'batch' })).toBe('Default batch');
  });
});

describe('reportRange', () => {
  const from = new Date(2026, 10, 1);

  it('sends both dates of a period, and only those set', () => {
    expect(reportRange('period', from, NOV_2)).toEqual({ fromDate: '2026-11-01', toDate: '2026-11-02' });
    expect(reportRange('period', null, NOV_2)).toEqual({ toDate: '2026-11-02' });
  });

  it('sends only the end of an as-of report and nothing for an undated one', () => {
    expect(reportRange('asOf', from, NOV_2)).toEqual({ toDate: '2026-11-02' });
    expect(reportRange('none', from, NOV_2)).toEqual({});
  });
});

describe('report helpers', () => {
  it('starts a period on the first of the month', () => {
    expect(startOfMonth(NOV_2)).toEqual(new Date(2026, 10, 1));
  });

  it('names the export after the report and the day', () => {
    expect(reportFileName('Purchase by Vendor', NOV_2)).toBe('purchase-by-vendor-2026-11-02');
    expect(reportFileName('Ledger Cash & Bank', NOV_2)).toBe('ledger-cash-bank-2026-11-02');
  });

  it('reads a positive balance as debit and a negative one as credit', () => {
    expect(balanceSide(10)).toBe('Dr');
    expect(balanceSide(-10)).toBe('Cr');
    expect(balanceSide(0.001)).toBe('');
  });
});
