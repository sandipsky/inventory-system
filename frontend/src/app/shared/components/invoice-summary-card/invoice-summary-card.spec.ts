import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { DiscountType } from '../../models/invoice.model';
import { InvoiceSummaryCard } from './invoice-summary-card';

describe('InvoiceSummaryCard', () => {
  let component: InvoiceSummaryCard;
  let fixture: ComponentFixture<InvoiceSummaryCard>;
  let discountType: FormControl<DiscountType>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceSummaryCard],
    }).compileComponents();

    discountType = new FormControl<DiscountType>('Percentage', { nonNullable: true });
    fixture = TestBed.createComponent(InvoiceSummaryCard);
    fixture.componentRef.setInput('summary', {
      gross: 1000, discountAmount: 100, taxable: 900, nonTaxable: 0, tax: 117, rounding: 0, net: 1017,
    });
    fixture.componentRef.setInput('discountType', discountType);
    fixture.componentRef.setInput('discount', new FormControl<number | null>(10));
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('shows the totals', () => {
    const net = (fixture.nativeElement as HTMLElement).querySelector('.field.net .value');
    expect(net?.textContent?.trim()).toBe('1,017.00');
  });

  it('follows the discount type control', async () => {
    expect(component.percent()).toBe(true);
    discountType.setValue('Flat');
    await fixture.whenStable();
    expect(component.percent()).toBe(false);
  });
});
