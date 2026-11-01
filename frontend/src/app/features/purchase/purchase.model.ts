import { CalendarSystem } from '@lumen-ui/angular';
import { DiscountType, TransactionType } from '../../shared/models/invoice.model';

/** How a purchase entry or return form was opened. `view` can switch to `edit` from inside the drawer. */
export type PurchaseFormMode = 'add' | 'edit' | 'view';

/** Data handed to the purchase entry and purchase return forms through DRAWER_DATA. */
export interface PurchaseFormData {
  mode: PurchaseFormMode;
  /** Purchase entry or return id; required for `edit` and `view`. */
  id?: number;
  /** Calendar the date fields start in; the list's AD/BS switch. Defaults to `bs`. */
  calendar?: CalendarSystem;
}

/** One item line (`purchaseEntries[]`). */
export interface PurchaseLine {
  /** Present on saved lines; send it back on update to keep the line, omit it to add one. */
  id?: number;
  product_id: number;
  product_name?: string;
  /** Typed in: an unknown number creates a batch, blank means the product's default batch. */
  batch_no: string | null;
  /** Read only: `0` is the default batch. */
  batch_id?: number;
  expiry_date: string | null;
  quantity: number;
  /** The purchase rate. */
  cost_price: number;
  selling_price: number;
  mrp: number;
}

/** `GET /purchase/{id}` and the rows of `GET /purchase`. Field names are the API's. */
export interface Purchase {
  id: number;
  /** Posting date, `YYYY-MM-DD`. */
  date: string;
  bill_date: string | null;
  bill_no: string;
  /** e.g. `|PE-000001`; display it through the `docNo` pipe. */
  system_entry_no: string;
  transaction_type: TransactionType;
  vendor_id: number;
  vendor_name: string;
  discount_type: DiscountType | null;
  /** A percent of the gross for `Percentage`, an amount for `Flat`. */
  discount: number;
  /** Gross: sum of quantity × rate before discount. */
  sub_total: number;
  non_taxable_amount: number;
  taxable_amount: number;
  tax: number;
  rounded: boolean;
  rounding: number;
  grand_total: number;
  remarks: string | null;
  purchaseEntries: PurchaseLine[];
}

/** Body of `POST /purchase` and `PUT /purchase/{id}`. The server stores the totals as sent. */
export type PurchasePayload = Omit<Purchase, 'id' | 'system_entry_no' | 'vendor_name'>;

/** One item line of a purchase return (`purchaseReturnEntries[]`). */
export interface PurchaseReturnLine {
  /** Present on saved lines; send it back on update to keep the line, omit it to add one. */
  id?: number;
  product_id: number;
  product_name?: string;
  /** Picked from `GET /products/stockInfo/{id}`: the batch the goods leave. `0` is the default batch. */
  batch_id: number;
  /** Read only. */
  batch_no?: string | null;
  quantity: number;
  /** The return rate. */
  cost_price: number;
  selling_price: number;
  mrp: number;
}

/** `GET /purchase-return/{id}` and the rows of `GET /purchase-return`. Field names are the API's. */
export interface PurchaseReturn {
  id: number;
  /** Posting date, `YYYY-MM-DD`. */
  date: string;
  bill_no: string | null;
  /** e.g. `|PR-000001`; display it through the `docNo` pipe. */
  system_entry_no: string;
  transaction_type: TransactionType;
  vendor_id: number;
  vendor_name: string;
  /** The purchase the goods came back from; the form copies its lines when it is picked. */
  ref_purchase_id: number | null;
  /** Read only: the reference purchase's `system_entry_no`. */
  ref_purchase_no: string | null;
  discount_type: DiscountType | null;
  discount: number;
  sub_total: number;
  non_taxable_amount: number;
  taxable_amount: number;
  tax: number;
  rounded: boolean;
  rounding: number;
  grand_total: number;
  remarks: string | null;
  purchaseReturnEntries: PurchaseReturnLine[];
}

/** Body of `POST /purchase-return` and `PUT /purchase-return/{id}`. */
export type PurchaseReturnPayload = Omit<PurchaseReturn, 'id' | 'system_entry_no' | 'vendor_name' | 'ref_purchase_no'>;

/** `GET /vendor/{id}`: the fields the purchase form shows. */
export interface Vendor {
  id: number;
  name: string;
  registration_number: string | null;
  contact: string | null;
  address: string | null;
  email: string | null;
}
