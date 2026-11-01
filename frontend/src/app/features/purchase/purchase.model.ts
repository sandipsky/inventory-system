import { CalendarSystem } from '@lumen-ui/angular';
import { DiscountType } from '../../shared/models/invoice.model';

/** How the purchase entry form was opened. `view` can switch to `edit` from inside the drawer. */
export type PurchaseFormMode = 'add' | 'edit' | 'view';

/** Data handed to the purchase entry form through DRAWER_DATA. */
export interface PurchaseFormData {
  mode: PurchaseFormMode;
  /** Purchase entry id; required for `edit` and `view`. */
  id?: number;
  /** Calendar the date fields start in; the list's AD/BS switch. Defaults to `bs`. */
  calendar?: CalendarSystem;
}

/** `Cash` is paid now; `Credit` records an amount due to the vendor. */
export type TransactionType = 'Cash' | 'Credit';

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

/** `GET /vendor/{id}`: the fields the purchase form shows. */
export interface Vendor {
  id: number;
  name: string;
  registration_number: string | null;
  contact: string | null;
  address: string | null;
  email: string | null;
}
