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
import { BatchStock, Product } from '../../../../shared/models/product.model';
import { Sale, SalePayload, SalesFormData } from '../../sales.model';
import { SalesEntryForm } from './sales-entry-form';

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

const BATCHES: BatchStock[] = [
  { batch_id: 0, batch_no: null, expiry_date: null, available_quantity: 0, cost_price: 42, selling_price: 52, mrp: 57 },
  { batch_id: 1, batch_no: 'B1', expiry_date: '2027-06-30', available_quantity: 15, cost_price: 40, selling_price: 50, mrp: 55 },
  { batch_id: 3, batch_no: 'B2', expiry_date: '2027-01-31', available_quantity: 3, cost_price: 43, selling_price: 53, mrp: 58 },
];

const CUSTOMER = { id: 6, name: 'Ram Traders', registration_number: '601', contact: null, address: null, email: null };

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
  rounded: false,
  rounding: 0,
  grand_total: 1130,
  remarks: 'Credit sale',
  cancelled: false,
  cancel_remarks: null,
  salesEntries: [
    { id: 1, product_id: 31, product_name: 'Coca-Cola 500ml', batch_id: 1, batch_no: 'B1', quantity: 20, cost_price: 40, selling_price: 50, mrp: 55 },
  ],
};

describe('SalesEntryForm', () => {
  let http: HttpTestingController;

  async function setup(data?: SalesFormData, operations = ['CancelSalesEntry']) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [SalesEntryForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data ?? null },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations }));
    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<SalesEntryForm> = TestBed.createComponent(SalesEntryForm);
    http.expectOne(`${API}/dropdown/customer/active`).flush([{ id: 6, name: 'Ram Traders' }]);
    http.expectOne(`${API}/dropdown/products/inventory/sellable/active`).flush([{ id: 31, name: 'Coca-Cola 500ml' }]);
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  function flushProduct() {
    http.expectOne(`${API}/products/31`).flush(PRODUCT);
    http.expectOne(`${API}/products/stockInfo/31`).flush(BATCHES);
  }

  async function view(sale: Sale, operations?: string[]) {
    const result = await setup({ mode: 'view', id: 7 }, operations);
    http.expectOne(`${API}/sales/7`).flush(sale);
    flushProduct();
    http.expectOne(`${API}/customer/6`).flush(CUSTOMER);
    await result.fixture.whenStable();
    return result;
  }

  function footerLabels(fixture: ComponentFixture<SalesEntryForm>): string[] {
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('.foot l-button')].map(
      button => button.textContent?.trim() ?? '',
    );
  }

  afterEach(() => http.verify());

  it('starts an add form with one empty line and the next number', async () => {
    const { fixture, component } = await setup();
    http.expectOne(`${API}/sales/generateNumber`).flush('|SI-000008');
    await fixture.whenStable();

    expect(component.mode).toBe('add');
    expect(component.heading.title).toBe('Add Sales Invoice');
    expect(component.lines().length).toBe(1);
    expect(component.entryNo()).toBe('|SI-000008');
    expect(footerLabels(fixture)).toEqual(['Cancel', 'Add']);
  });

  it('sells from the earliest-expiring batch in stock and posts the invoice', async () => {
    const { fixture, component, drawerRef } = await setup();
    http.expectOne(`${API}/sales/generateNumber`).flush('|SI-000008');

    const line = component.lines()[0];
    line.controls.product_id.setValue(31);
    component.onProductChange(line, 31);
    flushProduct();

    // B2 expires first; the empty default batch is skipped.
    expect(line.getRawValue()).toMatchObject({ batch_id: 3, batch_no: 'B2', cost_price: 43, selling_price: 53, mrp: 58 });

    line.controls.batch_id.setValue(1);
    component.onBatchChange(line);
    line.controls.quantity.setValue(20);
    component.form.patchValue({ customer_id: 6, transaction_type: 'Credit', rounded: false });
    http.expectOne(`${API}/customer/6`).flush(CUSTOMER);
    await fixture.whenStable();

    expect(component.batchOf(line)?.expiry_date).toBe('2027-06-30');
    expect(component.summary()).toMatchObject({ gross: 1000, taxable: 1000, tax: 130, net: 1130 });

    component.save();
    const req = http.expectOne({ method: 'POST', url: `${API}/sales` });
    const body = req.request.body as SalePayload;
    expect(body).toMatchObject({ customer_id: 6, transaction_type: 'Credit', sub_total: 1000, total_tax: 130, grand_total: 1130 });
    expect(body.salesEntries).toEqual([
      { product_id: 31, batch_id: 1, quantity: 20, cost_price: 40, selling_price: 50, mrp: 55 },
    ]);
    req.flush({ success: true, message: 'Sales Added successfully', errorCode: 0, timestamp: 0, post_data_id: 8 });
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('views a saved sale read-only and cancels it with a reason', async () => {
    const { fixture, component, drawerRef } = await view(SALE);

    expect(component.readonly).toBe(true);
    expect(component.batchLabel(component.lines()[0])).toBe('B1');
    expect(component.summary().net).toBe(1130);
    expect(footerLabels(fixture)).toEqual(['Close', 'Cancel Invoice']);

    const open = vi
      .spyOn(TestBed.inject(ModalService), 'open')
      .mockReturnValue({ afterClosed: () => of(true) } as never);
    component.cancelSale();
    const data = open.mock.calls[0][1]?.data as CancelDialogData;
    data.onConfirm('Wrong customer').subscribe();
    const cancel = http.expectOne({ method: 'POST', url: `${API}/sales/7` });
    expect(cancel.request.body).toEqual({ cancel_remarks: 'Wrong customer' });
    cancel.flush({ success: true, message: 'Sales Cancelled successfully', errorCode: 0, timestamp: 0, post_data_id: 7 });
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('shows a cancelled sale with its reason and no Cancel button', async () => {
    const { fixture } = await view({ ...SALE, cancelled: true, cancel_remarks: 'Wrong customer' });
    const banner = (fixture.nativeElement as HTMLElement).querySelector('.cancelled');
    expect(banner?.textContent).toContain('Reason: Wrong customer');
    expect(footerLabels(fixture)).toEqual(['Close']);
  });

  it('offers Cancel only with the cancel permission', async () => {
    const { fixture } = await view(SALE, []);
    expect(footerLabels(fixture)).toEqual(['Close']);
  });

  it('does not post an incomplete invoice', async () => {
    const { component } = await setup();
    http.expectOne(`${API}/sales/generateNumber`).flush('|SI-000008');
    component.save();
    http.expectNone(`${API}/sales`);
    expect(component.form.controls.customer_id.touched).toBe(true);
  });
});
