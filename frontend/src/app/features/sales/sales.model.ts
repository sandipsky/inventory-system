import { CalendarSystem } from '@lumen-ui/angular';
import { DiscountType, TransactionType } from '../../shared/models/invoice.model';

/**
 * How a sales invoice or sales return form was opened. Neither is ever edited: a saved one
 * is only viewed, and cancelled instead of deleted.
 */
export type SalesFormMode = 'add' | 'view';

/** Data handed to the sales entry and sales return forms through DRAWER_DATA. */
export interface SalesFormData {
  mode: SalesFormMode;
  /** Sale or return id; required for `view`. */
  id?: number;
  /** Calendar the date fields start in; the list's AD/BS switch. Defaults to `bs`. */
  calendar?: CalendarSystem;
}

/** One item line of a sale (`salesEntries[]`). */
export interface SalesLine {
  id?: number;
  product_id: number;
  product_name?: string;
  /** Picked from `GET /products/stockInfo/{id}`: the batch the goods leave. `0` is the default batch. */
  batch_id: number;
  /** Read only. */
  batch_no?: string | null;
  quantity: number;
  /** The batch's cost, kept with the line. */
  cost_price: number;
  /** The sales rate. */
  selling_price: number;
  mrp: number;
}

/** `GET /sales/{id}` and the rows of `GET /sales`. Field names are the API's. */
export interface Sale {
  id: number;
  /** Posting date, `YYYY-MM-DD`. */
  date: string;
  /** e.g. `|SI-000001`; display it through the `docNo` pipe. */
  system_entry_no: string;
  transaction_type: TransactionType;
  customer_id: number;
  customer_name: string;
  discount_type: DiscountType | null;
  /** A percent of the gross for `Percentage`, an amount for `Flat`. */
  discount: number;
  sub_total: number;
  non_taxable_amount: number;
  taxable_amount: number;
  /** Sales name the tax `total_tax`; purchases name it `tax`. */
  total_tax: number;
  rounded: boolean;
  rounding: number;
  grand_total: number;
  remarks: string | null;
  cancelled: boolean;
  cancel_remarks: string | null;
  salesEntries: SalesLine[];
}

/** Body of `POST /sales`. The server stores the totals as sent. */
export type SalePayload = Omit<Sale, 'id' | 'system_entry_no' | 'customer_name' | 'cancelled' | 'cancel_remarks'>;

/** One item line of a sales return (`salesReturnEntries[]`). */
export interface SalesReturnLine {
  id?: number;
  product_id: number;
  product_name?: string;
  /** Typed in: the batch the goods go back into. An unknown number creates it, blank is the default batch. */
  batch_no: string | null;
  /** Read only: `0` is the default batch. */
  batch_id?: number;
  /** Stored on a new batch; blank keeps a known batch's date. */
  expiry_date: string | null;
  quantity: number;
  cost_price: number;
  /** The return rate. */
  selling_price: number;
  mrp: number;
}

/** `GET /sales-return/{id}` and the rows of `GET /sales-return`. Field names are the API's. */
export interface SalesReturn {
  id: number;
  date: string;
  /** e.g. `|SR-000001`. */
  system_entry_no: string;
  transaction_type: TransactionType;
  customer_id: number;
  customer_name: string;
  /** The sale the goods came back from; the form copies its lines when it is picked. */
  ref_sales_id: number | null;
  /** Read only: the reference sale's `system_entry_no`. */
  ref_sales_no: string | null;
  discount_type: DiscountType | null;
  discount: number;
  sub_total: number;
  non_taxable_amount: number;
  taxable_amount: number;
  total_tax: number;
  rounded: boolean;
  rounding: number;
  grand_total: number;
  remarks: string | null;
  cancelled: boolean;
  cancel_remarks: string | null;
  salesReturnEntries: SalesReturnLine[];
}

/** Body of `POST /sales-return`. */
export type SalesReturnPayload = Omit<
  SalesReturn,
  'id' | 'system_entry_no' | 'customer_name' | 'ref_sales_no' | 'cancelled' | 'cancel_remarks'
>;
