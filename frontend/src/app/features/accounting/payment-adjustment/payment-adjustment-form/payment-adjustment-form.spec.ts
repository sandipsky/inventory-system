import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DRAWER_DATA, DrawerRef, NotificationService } from '@lumen-ui/angular';
import { environment } from '../../../../../environments/environment';
import { OutstandingInvoice, Payment, PaymentDetail } from '../../payment/payment.model';
import { PaymentAdjustmentForm } from './payment-adjustment-form';

const API = environment.apiUrl;

/** Received 1500 from Ram Traders, 500 of it not settled yet. */
const PAYMENT: Payment = {
  id: 4,
  date: '2026-10-31',
  system_entry_no: '|P-000004',
  type: 'Customer',
  vendor_id: 0,
  vendor_name: null,
  customer_id: 6,
  customer_name: 'Ram Traders',
  payment_mode_id: 3,
  payment_mode_name: 'Cash',
  amount: 1500,
  total_payment_amount: 1500,
  total_adjusted_paid_amount: 1000,
  unadjusted_amount: 500,
  narration: null,
};

function due(party_id: number, invoice_number: string, invoice_date: string, total: number): OutstandingInvoice {
  return {
    party_type: 'Customer',
    party_id,
    party_name: 'Ram Traders',
    invoice_number,
    invoice_date,
    total_invoice_amount: total,
    paid_amount: 0,
    due_amount: total,
  };
}

describe('PaymentAdjustmentForm', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<PaymentAdjustmentForm>;
  let component: PaymentAdjustmentForm;
  const drawerRef = { close: vi.fn() };

  beforeEach(async () => {
    drawerRef.close.mockReset();
    await TestBed.configureTestingModule({
      imports: [PaymentAdjustmentForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: { payment: PAYMENT } },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PaymentAdjustmentForm);
    component = fixture.componentInstance;
    http
      .expectOne(`${API}/reports/accounting/receivable`)
      .flush([due(6, '|SI-000001', '2026-10-01', 300), due(7, '|SI-000002', '2026-10-02', 900), due(6, '|SI-000003', '2026-10-03', 400)]);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it("lists the customer's invoices due", () => {
    expect(component.loading()).toBe(false);
    expect(component.rows().map(row => row.invoice_number)).toEqual(['|SI-000001', '|SI-000003']);
  });

  it('settles the unadjusted amount oldest first', () => {
    component.settleOldestFirst();
    expect(component.rows().map(row => row.paid.value)).toEqual([300, 200]);
    expect(component.summary().map(item => item.value)).toEqual([500, 500, 0]);

    component.save();
    const req = http.expectOne({ method: 'POST', url: `${API}/payment-adjustment/4` });
    expect(req.request.body as PaymentDetail[]).toEqual([
      { invoice_number: '|SI-000001', invoice_date: '2026-10-01', total_invoice_amount: 300, due_amount: 0, paid_amount: 300 },
      { invoice_number: '|SI-000003', invoice_date: '2026-10-03', total_invoice_amount: 400, due_amount: 200, paid_amount: 200 },
    ]);
    req.flush({ success: true, message: 'Payment Adjusted successfully', errorCode: 0, timestamp: 0, post_data_id: 4 });
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('refuses nothing to adjust, or more than is unadjusted', () => {
    const warn = vi.spyOn(TestBed.inject(NotificationService), 'warn');
    component.save();
    expect(warn).toHaveBeenLastCalledWith('Nothing to adjust', 'Enter the amount to settle on at least one invoice.');

    component.rows()[0].paid.setValue(300);
    component.rows()[1].paid.setValue(300);
    component.save();
    expect(warn).toHaveBeenLastCalledWith(
      'Too much settled',
      'The invoices settled add up to more than the unadjusted amount.',
    );
  });
});
