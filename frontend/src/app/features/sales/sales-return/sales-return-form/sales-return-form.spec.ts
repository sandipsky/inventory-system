import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DRAWER_DATA, DrawerRef, ModalService } from '@lumen-ui/angular';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { CancelDialogData } from '../../../../shared/components/cancel-dialog/cancel-dialog';
import { Product } from '../../../../shared/models/product.model';
import { Sale, SalesFormData, SalesReturn, SalesReturnPayload } from '../../sales.model';
import { SalesReturnForm } from './sales-return-form';

const API = environment.apiUrl;

const PRODUCT: Product = {
  id: 31,
  name: 'Coca-Cola 500ml',
  code: 'BEV-001',
  cost_price: 40,
  selling_price: 50,
  mrp: 55,
  unit_id: 6,
  unit_name: 'Pcs',
  tax_type_id: 1,
  tax_type_name: 'VAT 13%',
  tax_rate: 13,
  has_expiry_date: true,
};

const CUSTOMER = { id: 6, name: 'Ram Traders', registration_number: null, contact: null, address: null, email: null };

const SALE: Sale = {
  id: 7,
  date: '2026-10-31',
  system_entry_no: '|SI-000007',
  transaction_type: 'Credit',
  customer_id: 6,
  customer_name: 'Ram Traders',
  discount_type: 'Flat',
  discount: 0,
  sub_total: 1000,
  non_taxable_amount: 0,
  taxable_amount: 1000,
  total_tax: 130,
  rounded: true,
  rounding: 0,
  grand_total: 1130,
  remarks: null,
  cancelled: false,
  cancel_remarks: null,
  salesEntries: [
    { id: 1, product_id: 31, product_name: 'Coca-Cola 500ml', batch_id: 1, batch_no: 'B1', quantity: 20, cost_price: 40, selling_price: 50, mrp: 55 },
  ],
};

const RETURN: SalesReturn = {
  id: 2,
  date: '2026-11-01',
  system_entry_no: '|SR-000002',
  transaction_type: 'Credit',
  customer_id: 6,
  customer_name: 'Ram Traders',
  ref_sales_id: 7,
  ref_sales_no: '|SI-000007',
  discount_type: 'Flat',
  discount: 0,
  sub_total: 100,
  non_taxable_amount: 0,
  taxable_amount: 100,
  total_tax: 13,
  rounded: false,
  rounding: 0,
  grand_total: 113,
  remarks: '2 damaged bottles',
  cancelled: false,
  cancel_remarks: null,
  salesReturnEntries: [
    { id: 3, product_id: 31, product_name: 'Coca-Cola 500ml', batch_id: 1, batch_no: 'B1', expiry_date: '2027-01-31', quantity: 2, cost_price: 40, selling_price: 50, mrp: 55 },
  ],
};

describe('SalesReturnForm', () => {
  let http: HttpTestingController;

  async function setup(data?: SalesFormData) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [SalesReturnForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data ?? null },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['CancelSalesReturn'] }));
    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<SalesReturnForm> = TestBed.createComponent(SalesReturnForm);
    http.expectOne(`${API}/dropdown/customer/active`).flush([{ id: 6, name: 'Ram Traders' }]);
    http.expectOne(`${API}/dropdown/products/inventory/sellable/active`).flush([{ id: 31, name: 'Coca-Cola 500ml' }]);
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  /** The customer's details and invoices, fetched whenever the customer changes. */
  function flushCustomer() {
    http.expectOne(`${API}/customer/6`).flush(CUSTOMER);
    http.expectOne(`${API}/dropdown/sales/6`).flush([{ id: 7, name: '|SI-000007' }]);
  }

  afterEach(() => http.verify());

  it('starts an add form with one empty line and the next number', async () => {
    const { fixture, component } = await setup();
    http.expectOne(`${API}/sales-return/generateNumber`).flush('|SR-000003');
    await fixture.whenStable();

    expect(component.heading.title).toBe('Add Sales Return');
    expect(component.lines().length).toBe(1);
    expect(component.entryNo()).toBe('|SR-000003');
  });

  it('copies a picked reference invoice and posts the return against it', async () => {
    const { fixture, component, drawerRef } = await setup();
    http.expectOne(`${API}/sales-return/generateNumber`).flush('|SR-000003');

    component.form.controls.customer_id.setValue(6);
    flushCustomer();
    await fixture.whenStable();
    expect(component.refOptions()).toEqual([{ id: 7, name: 'SI-000007' }]);

    component.form.controls.ref_sales_id.setValue(7);
    component.onRefChange(7);
    http.expectOne(`${API}/sales/7`).flush(SALE);
    http.expectOne(`${API}/products/31`).flush(PRODUCT);
    await fixture.whenStable();

    const line = component.lines()[0];
    expect(line.getRawValue()).toMatchObject({ product_id: 31, batch_no: 'B1', expiry_date: null, quantity: 20, selling_price: 50 });
    expect(component.form.getRawValue()).toMatchObject({ transaction_type: 'Credit', rounded: true });

    // Two came back.
    line.controls.quantity.setValue(2);
    expect(component.summary()).toMatchObject({ gross: 100, tax: 13, net: 113 });

    component.save();
    const req = http.expectOne({ method: 'POST', url: `${API}/sales-return` });
    const body = req.request.body as SalesReturnPayload;
    expect(body).toMatchObject({ customer_id: 6, ref_sales_id: 7, sub_total: 100, total_tax: 13, grand_total: 113 });
    expect(body.salesReturnEntries).toEqual([
      { product_id: 31, batch_no: 'B1', expiry_date: null, quantity: 2, cost_price: 40, selling_price: 50, mrp: 55 },
    ]);
    req.flush({ success: true, message: 'Sales Return Added successfully', errorCode: 0, timestamp: 0, post_data_id: 3 });
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('ignores a reference that changed while it loaded', async () => {
    const { component } = await setup();
    http.expectOne(`${API}/sales-return/generateNumber`).flush('|SR-000003');
    const before = component.lines();

    component.form.controls.ref_sales_id.setValue(7);
    component.onRefChange(7);
    component.form.controls.ref_sales_id.setValue(null);
    http.expectOne(`${API}/sales/7`).flush(SALE);
    http.expectOne(`${API}/products/31`).flush(PRODUCT);

    expect(component.lines()).toBe(before);
  });

  it('views a saved return with its reference and cancels it', async () => {
    const { fixture, component, drawerRef } = await setup({ mode: 'view', id: 2 });
    http.expectOne(`${API}/sales-return/2`).flush(RETURN);
    http.expectOne(`${API}/products/31`).flush(PRODUCT);
    flushCustomer();
    await fixture.whenStable();

    expect(component.readonly).toBe(true);
    expect(component.refOptions()).toEqual([{ id: 7, name: 'SI-000007' }]);
    expect(component.lines()[0].controls.expiry_date.value).toEqual(new Date(2027, 0, 31));
    expect(component.canCancel()).toBe(true);

    const open = vi
      .spyOn(TestBed.inject(ModalService), 'open')
      .mockReturnValue({ afterClosed: () => of(true) } as never);
    component.cancelReturn();
    const data = open.mock.calls[0][1]?.data as CancelDialogData;
    data.onConfirm('Entered twice').subscribe();
    http.expectOne({ method: 'POST', url: `${API}/sales-return/2` }).flush({});
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('does not offer Cancel on a cancelled return', async () => {
    const { fixture, component } = await setup({ mode: 'view', id: 2 });
    http.expectOne(`${API}/sales-return/2`).flush({ ...RETURN, cancelled: true, cancel_remarks: 'Entered twice' });
    http.expectOne(`${API}/products/31`).flush(PRODUCT);
    flushCustomer();
    await fixture.whenStable();

    expect(component.canCancel()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('.cancelled')?.textContent).toContain('Entered twice');
  });
});
