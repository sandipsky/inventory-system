import { CalendarSystem } from '@lumen-ui/angular';

/** `Vendor`: money paid to a vendor. `Customer`: money received from a customer. */
export type PartyType = 'Vendor' | 'Customer';

export const PARTY_TYPES: { label: string; value: PartyType }[] = [
  { label: 'Vendor', value: 'Vendor' },
  { label: 'Customer', value: 'Customer' },
];

/**
 * The form's Payment Type: the direction each party type's money goes. The API ties them,
 * so it is the party type under another label.
 */
export const PAYMENT_DIRECTIONS: { label: string; value: PartyType }[] = [
  { label: 'Send', value: 'Vendor' },
  { label: 'Receive', value: 'Customer' },
];

/** The operation that lets a user see payments of each party type. */
export const VIEW_PAYMENT_OPERATIONS: Record<PartyType, string> = {
  Vendor: 'ViewVendorPayment',
  Customer: 'ViewCustomerPayment',
};

/** How the payment form was opened. `view` can switch to `edit` from inside the drawer. */
export type PaymentFormMode = 'add' | 'edit' | 'view';

/** Data handed to the payment form through DRAWER_DATA. */
export interface PaymentFormData {
  mode: PaymentFormMode;
  /** Payment id; required for `edit` and `view`. */
  id?: number;
  /** Party types the user may pick (those they can view); defaults to both. */
  partyTypes?: PartyType[];
  /** Calendar the date fields start in; the list's AD/BS switch. Defaults to `bs`. */
  calendar?: CalendarSystem;
}

/** Data handed to the payment adjustment form through DRAWER_DATA. */
export interface PaymentAdjustmentFormData {
  /** The row of `GET /payment-adjustment` to adjust. */
  payment: Payment;
  calendar?: CalendarSystem;
}

/** One invoice a payment settles (`paymentDetails[]`). The invoice is a purchase or sales number. */
export interface PaymentDetail {
  id?: number;
  master_payment_id?: number;
  /** Raw `system_entry_no` of the purchase or sale, e.g. `|PE-000001`. */
  invoice_number: string;
  invoice_date: string | null;
  total_invoice_amount: number;
  /** What was still due on the invoice after this payment, when it was saved. */
  due_amount: number;
  paid_amount: number;
}

/** `GET /payment/{id}` and the rows of `GET /payment` and `GET /payment-adjustment`. */
export interface Payment {
  id: number;
  /** `YYYY-MM-DD`. */
  date: string;
  /** e.g. `|P-000001`; display it through the `docNo` pipe. */
  system_entry_no: string;
  type: PartyType;
  /** `0` on a customer payment. */
  vendor_id: number;
  vendor_name: string | null;
  /** `0` on a vendor payment. */
  customer_id: number;
  customer_name: string | null;
  /** The account the money went out of or into (Cash, a bank, …). */
  payment_mode_id: number;
  payment_mode_name: string | null;
  amount: number;
  total_payment_amount: number;
  /** The part settled against invoices so far. */
  total_adjusted_paid_amount: number;
  /** The part not settled yet: an advance that payment adjustment can apply later. */
  unadjusted_amount: number;
  narration: string | null;
  /** Only on `GET /payment/{id}`. */
  paymentDetails?: PaymentDetail[];
}

/** Body of `POST /payment` and `PUT /payment/{id}`. A blank narration is filled in by the API. */
export interface PaymentPayload {
  date: string;
  type: PartyType;
  vendor_id: number;
  customer_id: number;
  payment_mode_id: number;
  amount: number;
  narration: string;
  paymentDetails: PaymentDetail[];
}

/** A row of `GET /reports/accounting/payable` (vendors) or `receivable` (customers): an invoice with money due. */
export interface OutstandingInvoice {
  party_type: PartyType;
  party_id: number;
  party_name: string;
  invoice_number: string;
  invoice_date: string | null;
  total_invoice_amount: number;
  paid_amount: number;
  due_amount: number;
}
