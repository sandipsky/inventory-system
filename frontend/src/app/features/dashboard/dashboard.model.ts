/** `GET /dashboard/balances`: account-type balances now and 7 days ago. */
export interface BalanceSummary {
  /** Cash & Cash Equivalents accounts: money in hand and in the bank. */
  cash_balance: number;
  /** Payables accounts: what is owed to vendors. */
  payables: number;
  /** Receivables accounts: what customers owe. */
  receivables: number;
  payables_week_ago: number;
  receivables_week_ago: number;
}

export type TrendInterval = 'daily' | 'weekly' | 'monthly';

/** One day, week or month of `GET /dashboard/purchase-vs-sales`. */
export interface PurchaseSalesPoint {
  /** First and last day, `YYYY-MM-DD`. */
  from_date: string;
  to_date: string;
  /** Grand totals; `null` when the role may not view those documents. Cancelled sales count for nothing. */
  purchase: number | null;
  sales: number | null;
}

/** `GET /dashboard/purchase-vs-sales`: the last 30 days, 12 weeks or 12 months, oldest first. */
export interface PurchaseVsSales {
  interval: TrendInterval;
  points: PurchaseSalesPoint[];
}

/** `GET /dashboard/sales-summary`: each figure `null` when the role may not view its documents. */
export interface SalesSummary {
  total_sales: number | null;
  total_sales_return: number | null;
  /** Sales minus returns; needs both. */
  net_sales: number | null;
}

/** `GET /dashboard/purchase-summary`: each figure `null` when the role may not view its documents. */
export interface PurchaseSummary {
  total_purchase: number | null;
  total_purchase_return: number | null;
}

/** A row of `GET /dashboard/near-expiry`: a batch with stock, soonest expiry first. */
export interface NearExpiryBatch {
  product_id: number;
  product_name: string;
  /** `0` is the product's default batch, which has no `batch_no`. */
  batch_id: number;
  batch_no: string | null;
  /** `YYYY-MM-DD`; may be past. */
  expiry_date: string;
  quantity: number;
}

/** An active product's stock, every batch added up. */
export interface StockLevel {
  product_id: number;
  product_name: string;
  product_code: string | null;
  quantity: number;
  /** `null` when the product sets none. */
  min_stock: number | null;
}

/** `GET /dashboard/stock-alerts`. */
export interface StockAlerts {
  /** In stock, but at or below the minimum; lowest first. */
  minimum_stock: StockLevel[];
  /** Nothing left in any batch, never-stocked products included; by name. */
  zero_quantity: StockLevel[];
}

/** An inclusive `YYYY-MM-DD` range, sent as `fromDate` / `toDate`. */
export interface DateRange {
  fromDate: string;
  toDate: string;
}

/** Period choices of the summary and expiry cards, in months. */
export const MONTH_OPTIONS = [
  { label: '1 Month', value: 1 },
  { label: '3 Months', value: 3 },
  { label: '6 Months', value: 6 },
  { label: '12 Months', value: 12 },
];
