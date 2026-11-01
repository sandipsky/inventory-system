import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SummaryCard } from './summary-card';

describe('SummaryCard', () => {
  let fixture: ComponentFixture<SummaryCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SummaryCard] }).compileComponents();
    fixture = TestBed.createComponent(SummaryCard);
  });

  it('shows each figure as an amount, the bottom line in bold and the wrong ones in red', async () => {
    fixture.componentRef.setInput('items', [
      { label: 'Total Adjusted Paid Amount', value: 1400, error: true },
      { label: 'Total Payment Amount', value: 1500, net: true },
    ]);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.title')?.textContent).toBe('Summary');
    const fields = [...element.querySelectorAll('.field')];
    expect(fields.map(field => [field.querySelector('.label')?.textContent, field.querySelector('.value')?.textContent])).toEqual([
      ['Total Adjusted Paid Amount', '1,400.00'],
      ['Total Payment Amount', '1,500.00'],
    ]);
    expect(fields.map(field => [field.classList.contains('error'), field.classList.contains('net')])).toEqual([
      [true, false],
      [false, true],
    ]);
  });
});
