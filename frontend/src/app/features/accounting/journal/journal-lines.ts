import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { round2 } from '../../../shared/utils/invoice';
import { JournalLine, JournalPayload } from './journal.model';

/** One account line of the journal and opening balance forms. A blank amount is a zero. */
export type JournalLineForm = FormGroup<{
  account_master_id: FormControl<number | null>;
  narration: FormControl<string>;
  debit_amount: FormControl<number | null>;
  credit_amount: FormControl<number | null>;
}>;

export type JournalLineValue = ReturnType<JournalLineForm['getRawValue']>;

export interface JournalTotals {
  debit: number;
  credit: number;
  /** Debit − credit; `0` when the lines balance. */
  difference: number;
}

export function createJournalLine(fb: NonNullableFormBuilder, line?: JournalLine): JournalLineForm {
  return fb.group({
    account_master_id: fb.control<number | null>(line?.account_master_id ?? null, Validators.required),
    narration: fb.control(line?.narration ?? ''),
    // Saved lines carry a 0 on the side they don't use; the form shows that side blank.
    debit_amount: fb.control<number | null>(line?.debit_amount || null, Validators.min(0)),
    credit_amount: fb.control<number | null>(line?.credit_amount || null, Validators.min(0)),
  });
}

export function journalTotals(lines: readonly JournalLineValue[]): JournalTotals {
  const debit = round2(lines.reduce((sum, line) => sum + (line.debit_amount ?? 0), 0));
  const credit = round2(lines.reduce((sum, line) => sum + (line.credit_amount ?? 0), 0));
  return { debit, credit, difference: round2(debit - credit) };
}

/**
 * Why the lines can't be saved, or `null` when they can: every line debits or credits one
 * account (not both), and the debits equal the credits.
 */
export function journalLinesProblem(lines: readonly JournalLineValue[]): { title: string; message: string } | null {
  if (!lines.length) {
    return { title: 'No accounts', message: 'Add the accounts to debit and credit.' };
  }
  if (lines.some(line => !line.debit_amount === !line.credit_amount)) {
    return { title: 'Check the amounts', message: 'Each line needs either a debit or a credit amount, not both.' };
  }
  const totals = journalTotals(lines);
  if (totals.difference !== 0) {
    return { title: 'Not balanced', message: 'Total debit and total credit must be equal.' };
  }
  return null;
}

/**
 * The lines as the API takes them. The ledger shows each line's narration, so a blank one
 * gets `fallbackNarration` (the journal's remarks).
 */
export function toJournalLines(
  lines: readonly JournalLineValue[],
  fallbackNarration: string | null,
): JournalPayload['journalEntries'] {
  return lines.map(line => ({
    // Required, so it is set once the form is valid.
    account_master_id: line.account_master_id!,
    debit_amount: line.debit_amount ?? 0,
    credit_amount: line.credit_amount ?? 0,
    narration: line.narration.trim() || fallbackNarration,
  }));
}
