import { IconName } from '@lumen-ui/angular';
import { round2 } from '../../shared/utils/invoice';

/** `fromDate` / `toDate` (`YYYY-MM-DD`, inclusive) sent to a report; leave one out for no limit on that side. */
export interface ReportRange {
  fromDate?: string;
  toDate?: string;
}

/**
 * The dates a report takes: `period` a from–to range, `asOf` everything up to one date (only `toDate`
 * is sent), `none` no dates (the report is always as of now).
 */
export type ReportRangeKind = 'period' | 'asOf' | 'none';

/**
 * How a cell shows its value: `amount` with two decimals, `number` as is (quantities, counts),
 * `date` in the page's AD/BS calendar, `docNo` through the docNo pipe, `batch` as the batch name,
 * `account` as a link to the account's ledger (the row needs an `account_id`).
 */
export type ReportCellFormat = 'text' | 'amount' | 'number' | 'date' | 'docNo' | 'batch' | 'account';

export type ReportRow = Record<string, any>;

export interface ReportColumn {
  /** The row field shown, and the column's sort key. */
  key: string;
  header: string;
  format?: ReportCellFormat;
  /** Derives the value when the row has no field for it; sorting, totals and the export use it too. */
  value?: (row: ReportRow) => unknown;
  /** Adds the column up in the totals row. Cancelled rows count for nothing. */
  total?: boolean;
  width?: string;
}

/** A report as the Reports page lists it. */
export interface ReportLink {
  title: string;
  description: string;
  /** Under `/reports`, both for the page and for its API endpoint (`GET /reports/<path>`). */
  path: string;
  /** The operation the API checks, or several, any of which grants it. */
  operation: string | string[];
}

/** A report that ReportView shows: one API list, one table. */
export interface ReportConfig extends ReportLink {
  range: ReportRangeKind;
  columns: ReportColumn[];
  /** Shown when the report has no rows. */
  emptyText: string;
}

/** A row of `GET /reports/purchase`, `/purchase-return`, `/sales` and `/sales-return`: one document. */
export interface DocumentReportRow {
  id: number;
  /** `YYYY-MM-DD`. */
  date: string;
  /** e.g. `|PE-000001`; display it through the `docNo` pipe. */
  system_entry_no: string;
  /** Purchases and purchase returns only. */
  bill_no?: string | null;
  vendor_name?: string | null;
  customer_name?: string | null;
  transaction_type: string;
  sub_total: number;
  /** What the user typed: a percent or an amount. The discount amount is derived (`discountAmount`). */
  discount: number;
  non_taxable_amount: number;
  taxable_amount: number;
  total_tax: number;
  grand_total: number;
  /** Sales and sales returns only; the register lists cancelled documents too. */
  is_cancelled?: boolean;
}

/** A row of the `…/vendor` and `…/customer` reports: one party's documents added up. */
export interface PartyTotalRow {
  vendor_id?: number;
  vendor_name?: string;
  customer_id?: number;
  customer_name?: string;
  entry_count: number;
  sub_total: number;
  total_tax: number;
  grand_total: number;
}

/**
 * A row of the `…/product` and `…/batch` reports. `amount` is quantity × the line's cost price on
 * the purchase side and quantity × its selling price on the sales side. Only the batch reports
 * carry the batch fields; `batch_id` 0 is the product's default batch.
 */
export interface ProductTotalRow {
  product_id: number;
  product_name: string;
  batch_id?: number;
  batch_no?: string | null;
  expiry_date?: string | null;
  quantity: number;
  amount: number;
}

/** A row of `GET /reports/inventory/stock`: one product batch now. */
export interface StockReportRow {
  id: number;
  product_id: number;
  product_name: string;
  batch_id: number;
  batch_no: string | null;
  expiry_date: string | null;
  quantity: number;
  cost_price: number;
  selling_price: number;
  mrp: number;
  /** quantity × cost price. */
  stock_value: number;
}

/** A row of `GET /reports/accounting/journal`: one journal line, of a manual journal or a document. */
export interface JournalReportRow {
  date: string;
  system_entry_no: string;
  account_name: string;
  narration: string | null;
  debit_amount: number;
  credit_amount: number;
}

/** A row of `GET /reports/accounting/trial-balance`. */
export interface TrialBalanceRow {
  account_id: number;
  account_code: string | null;
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  debit_balance: number;
  credit_balance: number;
}

/** A line of the ledger. */
export interface LedgerRow {
  date: string;
  system_entry_no: string;
  narration: string | null;
  debit_amount: number;
  credit_amount: number;
  /** Running balance after this line: positive a debit balance, negative a credit balance. */
  balance: number;
}

/** `GET /reports/accounting/ledger/{accountId}`. Balances are positive for debit, negative for credit. */
export interface Ledger {
  account_id: number;
  account_name: string;
  /** Everything before `fromDate`; `0` without one. */
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  rows: LedgerRow[];
}

/** The discount amount of a document: `discount` is what the user typed, a percent or an amount. */
export function discountAmount(row: ReportRow): number {
  const { sub_total, taxable_amount, non_taxable_amount } = row as DocumentReportRow;
  return Math.max(round2(sub_total - taxable_amount - non_taxable_amount), 0);
}

// Columns the purchase-side and sales-side reports share; the party column differs.

function registerColumns(party: 'vendor' | 'customer'): ReportColumn[] {
  return [
    { key: 'date', header: 'Date', format: 'date' },
    { key: 'system_entry_no', header: 'Entry No', format: 'docNo' },
    ...(party === 'vendor' ? [{ key: 'bill_no', header: 'Bill No' }] : []),
    { key: `${party}_name`, header: party === 'vendor' ? 'Vendor' : 'Customer' },
    { key: 'transaction_type', header: 'Type' },
    { key: 'sub_total', header: 'Gross Amt.', format: 'amount', total: true },
    { key: 'discount', header: 'Discount', format: 'amount', total: true, value: discountAmount },
    { key: 'non_taxable_amount', header: 'Non-Taxable', format: 'amount', total: true },
    { key: 'taxable_amount', header: 'Taxable', format: 'amount', total: true },
    { key: 'total_tax', header: 'Tax', format: 'amount', total: true },
    { key: 'grand_total', header: 'Net Amt.', format: 'amount', total: true },
  ];
}

function partyColumns(party: 'vendor' | 'customer'): ReportColumn[] {
  return [
    { key: `${party}_name`, header: party === 'vendor' ? 'Vendor' : 'Customer' },
    { key: 'entry_count', header: 'Entries', format: 'number', total: true },
    { key: 'sub_total', header: 'Gross Amt.', format: 'amount', total: true },
    { key: 'total_tax', header: 'Tax', format: 'amount', total: true },
    { key: 'grand_total', header: 'Net Amt.', format: 'amount', total: true },
  ];
}

const PRODUCT_COLUMNS: ReportColumn[] = [
  { key: 'product_name', header: 'Product' },
  { key: 'quantity', header: 'Quantity', format: 'number' },
  { key: 'amount', header: 'Amount', format: 'amount', total: true },
];

const BATCH_COLUMNS: ReportColumn[] = [
  { key: 'product_name', header: 'Product' },
  { key: 'batch_no', header: 'Batch', format: 'batch' },
  { key: 'expiry_date', header: 'Expiry Date', format: 'date' },
  { key: 'quantity', header: 'Quantity', format: 'number' },
  { key: 'amount', header: 'Amount', format: 'amount', total: true },
];

const OUTSTANDING_COLUMNS: ReportColumn[] = [
  { key: 'invoice_date', header: 'Invoice Date', format: 'date' },
  { key: 'invoice_number', header: 'Invoice No', format: 'docNo' },
  { key: 'total_invoice_amount', header: 'Invoice Amt.', format: 'amount', total: true },
  { key: 'paid_amount', header: 'Paid', format: 'amount', total: true },
  { key: 'due_amount', header: 'Due', format: 'amount', total: true },
];

const PERIOD_EMPTY = 'Nothing recorded in this period.';

/**
 * The four reports of each document kind: its register and its totals per party, product and batch.
 * They are alike apart from the path, the party and the permission.
 */
function documentReports(
  path: string,
  name: string,
  /** One document, as the register's description names it: `sale`, `purchase return`, … */
  document: string,
  party: 'vendor' | 'customer',
  operation: string,
  cancellable = false,
): ReportConfig[] {
  const partyLabel = party === 'vendor' ? 'Vendor' : 'Customer';
  const left = cancellable ? ', cancelled ones left out' : '';
  return [
    {
      title: `${name} Register`,
      description: `Every ${document} with its totals${cancellable ? ', cancelled ones marked' : ''}.`,
      path,
      operation,
      range: 'period',
      columns: registerColumns(party),
      emptyText: PERIOD_EMPTY,
    },
    {
      title: `${name} by ${partyLabel}`,
      description: `Totals for each ${party}${left}.`,
      path: `${path}/${party}`,
      operation,
      range: 'period',
      columns: partyColumns(party),
      emptyText: PERIOD_EMPTY,
    },
    {
      title: `${name} by Product`,
      description: `Quantity and amount of each product${left}.`,
      path: `${path}/product`,
      operation,
      range: 'period',
      columns: PRODUCT_COLUMNS,
      emptyText: PERIOD_EMPTY,
    },
    {
      title: `${name} by Batch`,
      description: `Quantity and amount of each product batch${left}.`,
      path: `${path}/batch`,
      operation,
      range: 'period',
      columns: BATCH_COLUMNS,
      emptyText: PERIOD_EMPTY,
    },
  ];
}

export const PURCHASE_REPORTS = documentReports('purchase', 'Purchase', 'purchase', 'vendor', 'ViewPurchaseEntry');
export const PURCHASE_RETURN_REPORTS = documentReports(
  'purchase-return',
  'Purchase Return',
  'purchase return',
  'vendor',
  'ViewPurchaseReturn',
);
export const SALES_REPORTS = documentReports('sales', 'Sales', 'sale', 'customer', 'ViewSalesEntries', true);
export const SALES_RETURN_REPORTS = documentReports(
  'sales-return',
  'Sales Return',
  'sales return',
  'customer',
  'ViewSalesReturns',
  true,
);

export const STOCK_REPORT: ReportConfig = {
  title: 'Stock Report',
  description: 'Current stock and stock value of every product batch.',
  path: 'inventory/stock',
  operation: 'ViewStockEdit',
  range: 'none',
  columns: [
    { key: 'product_name', header: 'Product' },
    { key: 'batch_no', header: 'Batch', format: 'batch' },
    { key: 'expiry_date', header: 'Expiry Date', format: 'date' },
    { key: 'quantity', header: 'In Stock', format: 'number' },
    { key: 'cost_price', header: 'Cost Price', format: 'amount' },
    { key: 'selling_price', header: 'Selling Price', format: 'amount' },
    { key: 'mrp', header: 'MRP', format: 'amount' },
    { key: 'stock_value', header: 'Stock Value', format: 'amount', total: true },
  ],
  emptyText: 'No product batches yet.',
};

export const JOURNAL_REPORT: ReportConfig = {
  title: 'Journal Report',
  description: 'Every journal line posted, by manual journals and documents alike.',
  path: 'accounting/journal',
  operation: 'ViewAccount',
  range: 'period',
  columns: [
    { key: 'date', header: 'Date', format: 'date' },
    { key: 'system_entry_no', header: 'Entry No', format: 'docNo' },
    { key: 'account_name', header: 'Account' },
    { key: 'narration', header: 'Narration' },
    { key: 'debit_amount', header: 'Debit', format: 'amount', total: true },
    { key: 'credit_amount', header: 'Credit', format: 'amount', total: true },
  ],
  emptyText: PERIOD_EMPTY,
};

/** Its own page (LedgerReport): it needs an account picked and shows a running balance. */
export const LEDGER_REPORT: ReportLink = {
  title: 'Ledger',
  description: "One account's entries with its running balance.",
  path: 'accounting/ledger',
  operation: 'ViewAccount',
};

export const TRIAL_BALANCE_REPORT: ReportConfig = {
  title: 'Trial Balance',
  description: 'Debit and credit balance of every account as of a date.',
  path: 'accounting/trial-balance',
  operation: 'ViewAccount',
  range: 'asOf',
  columns: [
    { key: 'account_code', header: 'Code', width: '96px' },
    { key: 'account_name', header: 'Account', format: 'account' },
    { key: 'account_type', header: 'Account Type' },
    { key: 'total_debit', header: 'Total Debit', format: 'amount', total: true },
    { key: 'total_credit', header: 'Total Credit', format: 'amount', total: true },
    { key: 'debit_balance', header: 'Debit Balance', format: 'amount', total: true },
    { key: 'credit_balance', header: 'Credit Balance', format: 'amount', total: true },
  ],
  emptyText: 'No accounts have entries up to this date.',
};

export const RECEIVABLE_REPORT: ReportConfig = {
  title: 'Accounts Receivable',
  description: 'Customer invoices with money still due.',
  path: 'accounting/receivable',
  operation: ['ViewCustomerPayment', 'ViewAccount', 'CreatePaymentAdjustment'],
  range: 'none',
  columns: [{ key: 'party_name', header: 'Customer' }, ...OUTSTANDING_COLUMNS],
  emptyText: 'No customer owes anything.',
};

export const PAYABLE_REPORT: ReportConfig = {
  title: 'Accounts Payable',
  description: 'Vendor invoices with money still due.',
  path: 'accounting/payable',
  operation: ['ViewVendorPayment', 'ViewAccount', 'CreatePaymentAdjustment'],
  range: 'none',
  columns: [{ key: 'party_name', header: 'Vendor' }, ...OUTSTANDING_COLUMNS],
  emptyText: 'Nothing is owed to any vendor.',
};

/** Every report ReportView shows, by path. */
export const REPORTS: Record<string, ReportConfig> = Object.fromEntries(
  [
    ...PURCHASE_REPORTS,
    ...PURCHASE_RETURN_REPORTS,
    ...SALES_REPORTS,
    ...SALES_RETURN_REPORTS,
    STOCK_REPORT,
    JOURNAL_REPORT,
    TRIAL_BALANCE_REPORT,
    RECEIVABLE_REPORT,
    PAYABLE_REPORT,
  ].map(report => [report.path, report]),
);

export interface ReportGroup {
  title: string;
  subtitle: string;
  icon: IconName;
  reports: ReportLink[];
}

/** The Reports page, card by card. */
export const REPORT_GROUPS: ReportGroup[] = [
  { title: 'Purchase', subtitle: 'Purchase invoices and what they bought.', icon: 'bag', reports: PURCHASE_REPORTS },
  {
    title: 'Purchase Return',
    subtitle: 'Goods sent back to vendors.',
    icon: 'cart_return',
    reports: PURCHASE_RETURN_REPORTS,
  },
  { title: 'Sales', subtitle: 'Sales invoices and what they sold.', icon: 'bar_chart', reports: SALES_REPORTS },
  { title: 'Sales Return', subtitle: 'Goods customers sent back.', icon: 'undo', reports: SALES_RETURN_REPORTS },
  { title: 'Inventory', subtitle: 'Stock on hand and what it is worth.', icon: 'category', reports: [STOCK_REPORT] },
  {
    title: 'Accounting',
    subtitle: 'Journals, ledgers, balances and dues.',
    icon: 'moneys',
    reports: [JOURNAL_REPORT, LEDGER_REPORT, TRIAL_BALANCE_REPORT, RECEIVABLE_REPORT, PAYABLE_REPORT],
  },
];

/** Every operation that opens at least one report; the sidebar's Reports link carries the same list. */
export const REPORT_OPERATIONS: string[] = [
  ...new Set(REPORT_GROUPS.flatMap(group => group.reports.flatMap(report => report.operation))),
];
