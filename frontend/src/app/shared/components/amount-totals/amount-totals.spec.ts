import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AmountTotals } from './amount-totals';

describe('AmountTotals', () => {
  let fixture: ComponentFixture<AmountTotals>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AmountTotals] }).compileComponents();
    fixture = TestBed.createComponent(AmountTotals);
  });

  it('shows each total as an amount and marks the wrong ones', async () => {
    fixture.componentRef.setInput('items', [
      { label: 'Total Debit', value: 1500 },
      { label: 'Difference', value: 50, error: true },
    ]);
    await fixture.whenStable();

    const totals = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.total')];
    expect(totals.map(total => total.textContent?.trim())).toEqual(['Total Debit1,500.00', 'Difference50.00']);
    expect(totals.map(total => total.classList.contains('error'))).toEqual([false, true]);
  });
});
