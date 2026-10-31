import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvoiceSummaryCard } from './invoice-summary-card';

describe('InvoiceSummaryCard', () => {
  let component: InvoiceSummaryCard;
  let fixture: ComponentFixture<InvoiceSummaryCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceSummaryCard],
    }).compileComponents();

    fixture = TestBed.createComponent(InvoiceSummaryCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
