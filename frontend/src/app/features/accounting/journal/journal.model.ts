import { CalendarSystem } from '@lumen-ui/angular';

/** How the journal form was opened. `view` can switch to `edit` from inside the drawer. */
export type JournalFormMode = 'add' | 'edit' | 'view';

/** Data handed to the journal form through DRAWER_DATA. */
export interface JournalFormData {
  mode: JournalFormMode;
  /** Journal id; required for `edit` and `view`. */
  id?: number;
  /** Calendar the date field starts in; the list's AD/BS switch. Defaults to `bs`. */
  calendar?: CalendarSystem;
}

/** One account line (`journalEntries[]`): it debits or credits one account. */
export interface JournalLine {
  id?: number;
  account_master_id: number;
  /** Read only. */
  account_master_name?: string | null;
  debit_amount: number;
  credit_amount: number;
  narration: string | null;
}

/**
 * `GET /journal/{id}` and the rows of `GET /journal`, which lists manual journals only.
 * The opening balance (`GET /opening-balance`) has the same shape, with `id` 0 until it is set.
 */
export interface Journal {
  id: number;
  /** `YYYY-MM-DD`; `null` on an opening balance that isn't set yet. */
  date: string | null;
  /** e.g. `|J-000001` (display it through the `docNo` pipe); the opening balance is `OPENING-BALANCE`. */
  system_entry_no: string;
  remarks: string | null;
  /** `null` on an opening balance that isn't set yet. */
  journalEntries: JournalLine[] | null;
}

/** Body of `POST /journal`, `PUT /journal/{id}` and `POST /opening-balance`. Debits must equal credits. */
export interface JournalPayload {
  date: string;
  remarks: string | null;
  journalEntries: Omit<JournalLine, 'id' | 'account_master_name'>[];
}
