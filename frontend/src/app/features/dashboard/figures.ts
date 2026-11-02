import { fromIsoDate, toIsoDate } from '../../shared/utils/date';
import { DateRange, PurchaseSalesPoint, TrendInterval } from './dashboard.model';

/** The trend chart's intervals: the last 30 days, 12 weeks or 12 months. */
export const TREND_INTERVALS: { label: string; value: TrendInterval }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

// Three letters each; en-GB's `Sept` would stand out.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

const shortMonth = (date: Date) => MONTHS[date.getMonth()];
/** `12 Mar` */
const dayMonth = (date: Date) => `${date.getDate()} ${shortMonth(date)}`;
/** `Thu, 12 Mar 2026` */
const fullDay = (date: Date) => `${WEEKDAYS[date.getDay()]}, ${dayMonth(date)} ${date.getFullYear()}`;

/** A chart point's axis label (`Mar`, `12 Mar`) and tooltip heading (`March 2026`). */
export function pointLabels(interval: TrendInterval, point: PurchaseSalesPoint): { label: string; title: string } {
  const from = fromIsoDate(point.from_date)!;
  const to = fromIsoDate(point.to_date)!;
  if (interval === 'monthly') return { label: shortMonth(from), title: monthYear.format(from) };
  if (interval === 'weekly') return { label: dayMonth(from), title: `${dayMonth(from)} – ${dayMonth(to)} ${to.getFullYear()}` };
  return { label: dayMonth(from), title: fullDay(from) };
}

/** The current month and the `months − 1` before it, up to `today`. */
export function lastMonths(months: number, today = new Date()): DateRange {
  const first = new Date(today.getFullYear(), today.getMonth() - months + 1, 1);
  return { fromDate: toIsoDate(first), toDate: toIsoDate(today) };
}

/** Change from `before` to `now` in percent; `null` when there was nothing before to compare with. */
export function percentChange(now: number, before: number): number | null {
  if (Math.abs(before) < 0.005) return null;
  return ((now - before) / Math.abs(before)) * 100;
}
