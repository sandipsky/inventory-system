import { TestBed } from '@angular/core/testing';
import { NonNullableFormBuilder } from '@angular/forms';
import { JournalLineValue, createJournalLine, journalLinesProblem, journalTotals, toJournalLines } from './journal-lines';

const debit = (account: number, amount: number, narration = ''): JournalLineValue => ({
  account_master_id: account,
  narration,
  debit_amount: amount,
  credit_amount: null,
});
const credit = (account: number, amount: number, narration = ''): JournalLineValue => ({
  account_master_id: account,
  narration,
  debit_amount: null,
  credit_amount: amount,
});

describe('journal lines', () => {
  it('shows the unused side of a saved line blank', () => {
    const fb = TestBed.inject(NonNullableFormBuilder);
    const line = createJournalLine(fb, { account_master_id: 9, debit_amount: 500, credit_amount: 0, narration: null });
    expect(line.getRawValue()).toEqual({ account_master_id: 9, narration: '', debit_amount: 500, credit_amount: null });
  });

  it('totals the debits and credits, rounded to paisa', () => {
    expect(journalTotals([debit(9, 0.1), debit(8, 0.2), credit(3, 0.3)])).toEqual({ debit: 0.3, credit: 0.3, difference: 0 });
    expect(journalTotals([debit(9, 500), credit(3, 450)]).difference).toBe(50);
  });

  it('accepts balanced one-sided lines only', () => {
    expect(journalLinesProblem([debit(9, 500), credit(3, 500)])).toBeNull();
    expect(journalLinesProblem([])?.title).toBe('No accounts');
    expect(journalLinesProblem([debit(9, 500), { ...credit(3, 500), debit_amount: 500 }])?.title).toBe('Check the amounts');
    expect(journalLinesProblem([debit(9, 500), credit(3, 500), { ...debit(8, 0), debit_amount: null }])?.title).toBe(
      'Check the amounts',
    );
    expect(journalLinesProblem([debit(9, 500), credit(3, 400)])?.title).toBe('Not balanced');
  });

  it('sends blank sides as 0 and blank narrations as the fallback', () => {
    expect(toJournalLines([debit(9, 500, ' Diesel '), credit(3, 500)], 'Fuel bill')).toEqual([
      { account_master_id: 9, debit_amount: 500, credit_amount: 0, narration: 'Diesel' },
      { account_master_id: 3, debit_amount: 0, credit_amount: 500, narration: 'Fuel bill' },
    ]);
  });
});
