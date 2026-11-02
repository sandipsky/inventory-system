import { CalendarSystem, TableSort } from '@lumen-ui/angular';
import { DocNoPipe } from '../../shared/pipes/doc-no.pipe';
import { batchName } from '../../shared/utils/batch';
import { toIsoDate } from '../../shared/utils/date';
import { round2 } from '../../shared/utils/invoice';
import { ReportColumn, ReportRange, ReportRangeKind, ReportRow } from './report.model';

// The reports come back whole, so the page searches, sorts and adds them up itself.

const docNo = new DocNoPipe();

/** A column's value in a row: what its `value` derives, else the row's field. */
export function cellValue(row: ReportRow, column: ReportColumn): unknown {
  return column.value ? column.value(row) : row[column.key];
}

/** The text a search looks in: what a text cell shows. Dates and figures are left out. */
function searchText(row: ReportRow, column: ReportColumn): string {
  const value = cellValue(row, column);
  switch (column.format) {
    case 'amount':
    case 'number':
    case 'date':
      return '';
    case 'docNo':
      return docNo.transform(value as string);
    case 'batch':
      return batchName(value as string);
    default:
      return value === null || value === undefined ? '' : String(value);
  }
}

/** The rows with a text cell containing `query`, ignoring case. */
export function searchRows(rows: ReportRow[], columns: ReportColumn[], query: string): ReportRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(row => columns.some(column => searchText(row, column).toLowerCase().includes(needle)));
}

const isBlank = (value: unknown) => value === null || value === undefined || value === '';

/** The rows sorted on one column: blanks last, numbers by size, text naturally (`PE-2` before `PE-10`). */
export function sortRows(rows: ReportRow[], columns: ReportColumn[], sort: TableSort | null): ReportRow[] {
  const column = sort && columns.find(c => c.key === sort.key);
  if (!column) return rows;
  const direction = sort.direction === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const x = cellValue(a, column);
    const y = cellValue(b, column);
    if (isBlank(x) || isBlank(y)) return Number(isBlank(x)) - Number(isBlank(y));
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * direction;
    return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * direction;
  });
}

/** Cancelled documents count for nothing in the totals, as in the API's own. */
export function isCancelled(row: ReportRow): boolean {
  return row['is_cancelled'] === true;
}

/** Each `total` column added up over the rows that aren't cancelled. */
export function columnTotals(rows: ReportRow[], columns: ReportColumn[]): Record<string, number> {
  const counted = rows.filter(row => !isCancelled(row));
  const totals: Record<string, number> = {};
  for (const column of columns) {
    if (!column.total) continue;
    totals[column.key] = round2(counted.reduce((sum, row) => sum + (Number(cellValue(row, column)) || 0), 0));
  }
  return totals;
}

/** A cell as the CSV export writes it: figures as plain numbers, dates as `YYYY-MM-DD`, numbers as shown. */
export function csvValue(row: ReportRow, column: ReportColumn): string | number | null {
  const value = cellValue(row, column);
  switch (column.format) {
    case 'docNo':
      return docNo.transform(value as string);
    case 'batch':
      return batchName(value as string);
    case 'amount':
      return typeof value === 'number' ? round2(value) : null;
    default:
      return isBlank(value) ? null : (value as string | number);
  }
}

/** `Dr` for a debit balance (positive), `Cr` for a credit one (negative), nothing for zero. */
export function balanceSide(balance: number): 'Dr' | 'Cr' | '' {
  if (balance > 0.005) return 'Dr';
  if (balance < -0.005) return 'Cr';
  return '';
}

/** The dates a report sends; only `toDate` for an `asOf` one and none for a `none` one. */
export function reportRange(kind: ReportRangeKind, from: Date | null, to: Date | null): ReportRange {
  const range: ReportRange = {};
  if (kind === 'period' && from) range.fromDate = toIsoDate(from);
  if (kind !== 'none' && to) range.toDate = toIsoDate(to);
  return range;
}

/** The first day of this month, where a period starts by default. */
export function startOfMonth(today = new Date()): Date {
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

/** The export's file name: `Purchase by Vendor` → `purchase-by-vendor-2026-11-02`. */
export function reportFileName(title: string, today = new Date()): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${toIsoDate(today)}`;
}

export const CALENDAR_OPTIONS: { label: string; value: CalendarSystem }[] = [
  { label: 'AD', value: 'ad' },
  { label: 'BS', value: 'bs' },
];
