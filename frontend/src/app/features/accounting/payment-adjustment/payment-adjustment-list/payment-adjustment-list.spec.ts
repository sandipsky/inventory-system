import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { Payment } from '../../payment/payment.model';
import { PaymentAdjustmentList } from './payment-adjustment-list';

const ROW: Payment = {
  id: 1,
  date: '2026-10-31',
  system_entry_no: '|P-000001',
  type: 'Vendor',
  vendor_id: 1,
  vendor_name: 'ABC Suppliers',
  customer_id: 0,
  customer_name: null,
  payment_mode_id: 3,
  payment_mode_name: 'Cash',
  amount: 2000,
  total_payment_amount: 2000,
  total_adjusted_paid_amount: 0,
  unadjusted_amount: 2000,
  narration: null,
};

describe('PaymentAdjustmentList', () => {
  let component: PaymentAdjustmentList;
  let fixture: ComponentFixture<PaymentAdjustmentList>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/payment-adjustment`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentAdjustmentList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewPaymentAdjustment', 'CreatePaymentAdjustment'] }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PaymentAdjustmentList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === url);
  }

  const adjustButtons = () =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('l-button')].filter(b => b.textContent?.includes('Adjust'));

  it('lists payments with money left from any date', async () => {
    const req = nextRequest();
    expect(req.request.params.has('fromDate')).toBe(false);
    expect(req.request.params.has('toDate')).toBe(false);
    expect(req.request.params.get('sort')).toBe('id:desc');
    req.flush({ content: [ROW], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(component.partyName(ROW)).toBe('ABC Suppliers');
    expect(adjustButtons().length).toBe(1);
  });

  it('narrows to a party type', () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    component.partyType.set('Vendor');
    const req = nextRequest();
    expect(req.request.params.get('type')).toBe('Vendor');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('offers Adjust only with the create permission', async () => {
    nextRequest().flush({ content: [ROW], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewPaymentAdjustment'] }));
    await fixture.whenStable();
    expect(adjustButtons().length).toBe(0);
  });
});
