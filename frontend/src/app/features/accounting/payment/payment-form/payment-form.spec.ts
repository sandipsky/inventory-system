import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DRAWER_DATA, DrawerRef, NotificationService } from '@lumen-ui/angular';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { OutstandingInvoice, Payment, PaymentFormData, PaymentPayload } from '../payment.model';
import { PaymentForm } from './payment-form';

const API = environment.apiUrl;

function due(party_id: number, invoice_number: string, invoice_date: string, total: number, paid: number): OutstandingInvoice {
  return {
    party_type: 'Vendor',
    party_id,
    party_name: 'ABC Suppliers',
    invoice_number,
    invoice_date,
    total_invoice_amount: total,
    paid_amount: paid,
    due_amount: total - paid,
  };
}

const PAYABLE = [
  due(1, '|PE-000001', '2026-10-01', 1000, 0),
  due(1, '|PE-000002', '2026-10-05', 500, 100),
  due(2, '|PE-000003', '2026-10-02', 800, 0),
];

/** Paid ABC Suppliers 1500, settling 600 of PE-000001; payables already take the 600 off. */
const PAYMENT: Payment = {
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
  amount: 1500,
  total_payment_amount: 1500,
  total_adjusted_paid_amount: 600,
  unadjusted_amount: 900,
  narration: 'Payment made to ABC Suppliers',
  paymentDetails: [
    { id: 1, master_payment_id: 1, invoice_number: '|PE-000001', invoice_date: '2026-10-01', total_invoice_amount: 1000, due_amount: 400, paid_amount: 600 },
  ],
};

describe('PaymentForm', () => {
  let http: HttpTestingController;

  async function setup(data?: PaymentFormData) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PaymentForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data ?? null },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['EditPayment'] }));
    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<PaymentForm> = TestBed.createComponent(PaymentForm);
    const types = data?.partyTypes ?? ['Vendor', 'Customer'];
    if (types.includes('Vendor')) http.expectOne(`${API}/dropdown/vendor/active`).flush([{ id: 1, name: 'ABC Suppliers' }]);
    if (types.includes('Customer')) http.expectOne(`${API}/dropdown/customer/active`).flush([{ id: 6, name: 'Ram Traders' }]);
    http.expectOne(`${API}/dropdown/paymentModes`).flush([
      { id: 1, name: 'Cash In Hand' },
      { id: 3, name: 'Cash' },
    ]);
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  /** Picks ABC Suppliers, whose invoices due then load. */
  async function pickVendor(fixture: ComponentFixture<PaymentForm>) {
    fixture.componentInstance.form.controls.party_id.setValue(1);
    await fixture.whenStable();
    http.expectOne(`${API}/reports/accounting/payable`).flush(PAYABLE);
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  it('starts a vendor payment from the Cash account with the next number', async () => {
    const { fixture, component } = await setup();
    http.expectOne(`${API}/payment/generateNumber`).flush('|P-000002');
    await fixture.whenStable();

    expect(component.form.getRawValue()).toMatchObject({ type: 'Vendor', party_id: null, payment_mode_id: 3 });
    expect(component.partyOptions()).toEqual([{ id: 1, name: 'ABC Suppliers' }]);
    expect(component.entryNo()).toBe('|P-000002');
  });

  it("settles the vendor's invoices oldest first and posts what it settles", async () => {
    const { fixture, component, drawerRef } = await setup();
    http.expectOne(`${API}/payment/generateNumber`).flush('|P-000002');
    await pickVendor(fixture);

    expect(component.settlementTitle()).toBe('Payment Send Details');
    expect(component.rows().map(row => [row.invoice_number, row.due_amount])).toEqual([
      ['|PE-000001', 1000],
      ['|PE-000002', 400],
    ]);

    component.form.patchValue({ date: new Date(2026, 9, 31), amount: 1500 });
    component.settleOldestFirst();
    expect(component.rows().map(row => row.paid.value)).toEqual([1000, 400]);
    expect(component.summary().map(item => [item.label, item.value])).toEqual([
      ['Total Adjusted Paid Amount', 1400],
      ['Unadjusted Amount', 100],
      ['Total Payment Amount', 1500],
    ]);

    component.save();
    const req = http.expectOne({ method: 'POST', url: `${API}/payment` });
    expect(req.request.body as PaymentPayload).toEqual({
      date: '2026-10-31',
      type: 'Vendor',
      vendor_id: 1,
      customer_id: 0,
      payment_mode_id: 3,
      amount: 1500,
      narration: '',
      paymentDetails: [
        { invoice_number: '|PE-000001', invoice_date: '2026-10-01', total_invoice_amount: 1000, due_amount: 0, paid_amount: 1000 },
        { invoice_number: '|PE-000002', invoice_date: '2026-10-05', total_invoice_amount: 500, due_amount: 0, paid_amount: 400 },
      ],
    });
    req.flush({ success: true, message: 'Payment Added successfully', errorCode: 0, timestamp: 0, post_data_id: 2 });
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('starts over without a party when the party type (Send / Receive) changes', async () => {
    const { fixture, component } = await setup();
    http.expectOne(`${API}/payment/generateNumber`).flush('|P-000002');
    await pickVendor(fixture);
    expect(component.directions.map(direction => direction.label)).toEqual(['Send', 'Receive']);

    // Picking the same type again keeps the party.
    component.form.controls.type.setValue('Vendor');
    expect(component.form.controls.party_id.value).toBe(1);

    // Receive is the customer side.
    component.form.controls.type.setValue('Customer');
    await fixture.whenStable();
    expect(component.form.controls.party_id.value).toBeNull();
    expect(component.partyOptions()).toEqual([{ id: 6, name: 'Ram Traders' }]);
    expect(component.settlementTitle()).toBe('Payment Receive Details');
    expect(component.rows()).toEqual([]);

    component.form.controls.party_id.setValue(6);
    await fixture.whenStable();
    http.expectOne(`${API}/reports/accounting/receivable`).flush([]);
  });

  it('refuses to settle more than the payment amount', async () => {
    const { fixture, component } = await setup();
    http.expectOne(`${API}/payment/generateNumber`).flush('|P-000002');
    await pickVendor(fixture);
    const warn = vi.spyOn(TestBed.inject(NotificationService), 'warn');

    component.form.controls.amount.setValue(100);
    component.rows()[0].paid.setValue(200);
    component.save();
    expect(warn).toHaveBeenCalledWith('Too much settled', 'The invoices settled add up to more than the payment amount.');

    // More than an invoice's due amount is refused too.
    component.form.controls.amount.setValue(5000);
    component.rows()[1].paid.setValue(401);
    component.save();
    expect(warn).toHaveBeenLastCalledWith('Too much settled', 'An invoice cannot be settled for more than is due on it.');
  });

  it('edits a payment, counting what it settled as available again and keeping its narration', async () => {
    const { fixture, component } = await setup({ mode: 'edit', id: 1 });
    http.expectOne(`${API}/payment/1`).flush(PAYMENT);
    await fixture.whenStable();
    http.expectOne(`${API}/reports/accounting/payable`).flush([due(1, '|PE-000001', '2026-10-01', 1000, 600)]);
    await fixture.whenStable();

    expect(component.form.controls.party_id.value).toBe(1);
    const [row] = component.rows();
    expect([row.due_amount, row.paid.value]).toEqual([1000, 600]);

    row.paid.setValue(1000);
    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/payment/1` });
    const body = req.request.body as PaymentPayload;
    expect(body.paymentDetails.map(detail => detail.paid_amount)).toEqual([1000]);
    expect(body.narration).toBe('Payment made to ABC Suppliers');
    req.flush({});
  });

  it('shows only what a saved payment settled, fetching the invoices due once it is edited', async () => {
    const { fixture, component } = await setup({ mode: 'view', id: 1 });
    http.expectOne(`${API}/payment/1`).flush(PAYMENT);
    await fixture.whenStable();

    expect(component.readonly()).toBe(true);
    expect(component.rows().map(row => [row.invoice_number, row.paid.value])).toEqual([['|PE-000001', 600]]);
    expect(component.summary().map(item => item.value)).toEqual([600, 900, 1500]);

    component.startEdit();
    await fixture.whenStable();
    http.expectOne(`${API}/reports/accounting/payable`).flush(PAYABLE);
  });

  it('offers only the party types the user can view', async () => {
    const { fixture, component } = await setup({ mode: 'add', partyTypes: ['Customer'] });
    http.expectOne(`${API}/payment/generateNumber`).flush('|P-000002');
    await fixture.whenStable();

    expect(component.partyTypes).toEqual([{ label: 'Customer', value: 'Customer' }]);
    expect(component.directions).toEqual([{ label: 'Receive', value: 'Customer' }]);
    expect(component.form.controls.type.value).toBe('Customer');
  });
});
