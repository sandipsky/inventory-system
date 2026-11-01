import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { Payment } from '../payment.model';
import { PaymentList } from './payment-list';

const ROW: Payment = {
  id: 2,
  date: '2026-10-31',
  system_entry_no: '|P-000002',
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
  narration: 'Payment received from Ram Traders',
};

const EMPTY = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 };

describe('PaymentList', () => {
  let component: PaymentList;
  let fixture: ComponentFixture<PaymentList>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/payment`;

  async function setup(operations: string[]) {
    await TestBed.configureTestingModule({
      imports: [PaymentList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PaymentList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === url);
  }

  const typeSelect = () => (fixture.nativeElement as HTMLElement).querySelector('l-select.party-type');

  it('lists both kinds until a party type is picked', async () => {
    await setup(['ViewVendorPayment', 'ViewCustomerPayment']);
    const first = nextRequest();
    expect(first.request.params.has('type')).toBe(false);
    expect(first.request.params.get('sort')).toBe('id:desc');
    first.flush({ ...EMPTY, content: [ROW], totalElements: 1 });
    await fixture.whenStable();

    expect(typeSelect()).not.toBeNull();
    expect(component.partyName(ROW)).toBe('Ram Traders');

    component.pageIndex.set(2);
    component.partyType.set('Customer');
    component.resetPage();
    const picked = nextRequest();
    expect(picked.request.params.get('type')).toBe('Customer');
    expect(picked.request.params.get('pageIndex')).toBe('0');
    picked.flush(EMPTY);
  });

  it('shows only the one kind a role can view, without the dropdown', async () => {
    await setup(['ViewVendorPayment']);
    const req = nextRequest();
    expect(req.request.params.get('type')).toBe('Vendor');
    req.flush(EMPTY);
    await fixture.whenStable();

    expect(typeSelect()).toBeNull();
    expect(component.partyTypes().map(type => type.value)).toEqual(['Vendor']);
  });

  it('searches vendor and customer names alike and sorts by the backend field', async () => {
    await setup(['ViewVendorPayment', 'ViewCustomerPayment']);
    nextRequest().flush(EMPTY);

    component.sort.set({ key: 'payment_mode_name', direction: 'asc' });
    component.onFilterChange([{ field: 'partyName', value: 'ram', displayValue: 'ram' }]);
    const req = nextRequest();
    expect(req.request.params.get('partyName')).toBe('ram');
    expect(req.request.params.get('sort')).toBe('paymentMode.accountName:asc');
    req.flush(EMPTY);
  });
});
