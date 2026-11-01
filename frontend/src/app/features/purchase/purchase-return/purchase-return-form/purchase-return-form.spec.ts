import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DRAWER_DATA, DrawerRef } from '@lumen-ui/angular';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { BatchStock, Product } from '../../../../shared/models/product.model';
import { Purchase, PurchaseFormData, PurchaseReturn, PurchaseReturnPayload } from '../../purchase.model';
import { PurchaseReturnForm } from './purchase-return-form';

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
  { batch_id: 0, batch_no: null, expiry_date: null, available_quantity: 7, cost_price: 42, selling_price: 52, mrp: 57 },
  { batch_id: 1, batch_no: 'B1', expiry_date: '2027-01-31', available_quantity: 15, cost_price: 40, selling_price: 50, mrp: 55 },
];

const VENDOR = { id: 6, name: 'ABC Suppliers', registration_number: null, contact: null, address: null, email: null };

const PURCHASE: Purchase = {
  id: 3,
  date: '2026-10-30',
  bill_date: '2026-10-29',
  bill_no: 'INV-5501',
  system_entry_no: '|PE-000003',
  transaction_type: 'Credit',
  vendor_id: 6,
  vendor_name: 'ABC Suppliers',
  discount_type: 'Percentage',
  discount: 10,
  sub_total: 4800,
  non_taxable_amount: 0,
  taxable_amount: 4320,
  tax: 561.6,
  rounded: false,
  rounding: 0,
  grand_total: 4881.6,
  remarks: null,
  purchaseEntries: [
    {
      id: 1, product_id: 31, product_name: 'Coca-Cola 500ml', batch_id: 1, batch_no: 'B1',
      expiry_date: '2027-01-31', quantity: 120, cost_price: 40, selling_price: 50, mrp: 55,
    },
  ],
};

const RETURN: PurchaseReturn = {
  id: 2,
  date: '2026-10-31',
  bill_no: 'INV-5501',
  system_entry_no: '|PR-000002',
  transaction_type: 'Cash',
  vendor_id: 6,
  vendor_name: 'ABC Suppliers',
  ref_purchase_id: 3,
  ref_purchase_no: '|PE-000003',
  discount_type: 'Flat',
  discount: 0,
  sub_total: 200,
  non_taxable_amount: 0,
  taxable_amount: 200,
  tax: 26,
  rounded: false,
  rounding: 0,
  grand_total: 226,
  remarks: 'Expired items',
  purchaseReturnEntries: [
    { id: 4, product_id: 31, product_name: 'Coca-Cola 500ml', batch_id: 1, batch_no: 'B1', quantity: 5, cost_price: 40, selling_price: 50, mrp: 55 },
  ],
};

describe('PurchaseReturnForm', () => {
  let http: HttpTestingController;

  async function setup(data?: PurchaseFormData) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PurchaseReturnForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data ?? null },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['EditPurchaseReturn'] }));
    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<PurchaseReturnForm> = TestBed.createComponent(PurchaseReturnForm);
    http.expectOne(`${API}/dropdown/vendor/active`).flush([{ id: 6, name: 'ABC Suppliers' }]);
    http.expectOne(`${API}/dropdown/products/inventory/purchasable/active`).flush([{ id: 31, name: 'Coca-Cola 500ml' }]);
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  /** The vendor's details and purchases, fetched whenever the vendor changes. */
  function flushVendor() {
    http.expectOne(`${API}/vendor/6`).flush(VENDOR);
    http.expectOne(`${API}/dropdown/purchase/6`).flush([{ id: 3, name: '|PE-000003' }]);
  }

  function flushProduct() {
    http.expectOne(`${API}/products/31`).flush(PRODUCT);
    http.expectOne(`${API}/products/stockInfo/31`).flush(BATCHES);
  }

  afterEach(() => http.verify());

  it('starts an add form with one empty line and the next number', async () => {
    const { fixture, component } = await setup();
    http.expectOne(`${API}/purchase-return/generateNumber`).flush('|PR-000003');
    await fixture.whenStable();

    expect(component.title()).toBe('Add Purchase Return');
    expect(component.lines().length).toBe(1);
    expect(component.entryNo()).toBe('|PR-000003');
    expect(component.lineColumns().map(column => column.key)).toContain('stock');
  });

  it('takes a picked product from its first batch in stock, at that batch prices', async () => {
    const { component } = await setup();
    http.expectOne(`${API}/purchase-return/generateNumber`).flush('|PR-000003');

    const line = component.lines()[0];
    line.controls.product_id.setValue(31);
    component.onProductChange(line, 31);
    flushProduct();

    // B1 expires; the default batch has no date, so it goes last.
    expect(line.getRawValue()).toMatchObject({ batch_id: 1, batch_no: 'B1', cost_price: 40, mrp: 55 });
    expect(component.batchItems(line)).toEqual([
      { id: 0, name: 'Default batch · 7 in stock' },
      { id: 1, name: 'B1 · 15 in stock' },
    ]);

    line.controls.batch_id.setValue(0);
    component.onBatchChange(line);
    expect(line.getRawValue()).toMatchObject({ batch_id: 0, batch_no: null, cost_price: 42, mrp: 57 });
  });

  it('copies a picked reference purchase and posts the return against it', async () => {
    const { fixture, component, drawerRef } = await setup();
    http.expectOne(`${API}/purchase-return/generateNumber`).flush('|PR-000003');

    component.form.controls.vendor_id.setValue(6);
    flushVendor();
    await fixture.whenStable();
    expect(component.refOptions()).toEqual([{ id: 3, name: 'PE-000003' }]);

    component.form.controls.ref_purchase_id.setValue(3);
    component.onRefChange(3);
    http.expectOne(`${API}/purchase/3`).flush(PURCHASE);
    flushProduct();
    await fixture.whenStable();

    expect(component.lines().length).toBe(1);
    expect(component.lines()[0].getRawValue()).toMatchObject({ id: null, product_id: 31, batch_id: 1, quantity: 120 });
    expect(component.form.getRawValue()).toMatchObject({
      bill_no: 'INV-5501',
      transaction_type: 'Credit',
      discount_type: 'Percentage',
      discount: 10,
    });

    // Only 5 go back.
    component.lines()[0].controls.quantity.setValue(5);
    component.form.controls.rounded.setValue(false);
    expect(component.summary()).toMatchObject({ gross: 200, discountAmount: 20, tax: 23.4, net: 203.4 });

    component.save();
    const req = http.expectOne({ method: 'POST', url: `${API}/purchase-return` });
    const body = req.request.body as PurchaseReturnPayload;
    expect(body).toMatchObject({ vendor_id: 6, ref_purchase_id: 3, bill_no: 'INV-5501', tax: 23.4, grand_total: 203.4 });
    expect(body.purchaseReturnEntries).toEqual([
      { id: undefined, product_id: 31, batch_id: 1, quantity: 5, cost_price: 40, selling_price: 50, mrp: 55 },
    ]);
    req.flush({ success: true, message: 'Purchase Return Added successfully', errorCode: 0, timestamp: 0, post_data_id: 4 });
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('drops the reference when the user picks another vendor', async () => {
    const { component } = await setup();
    http.expectOne(`${API}/purchase-return/generateNumber`).flush('|PR-000003');
    component.form.controls.ref_purchase_id.setValue(3);
    component.onVendorChange();
    expect(component.form.controls.ref_purchase_id.value).toBeNull();
  });

  it('opens read-only in view mode, then edits with PUT keeping line ids', async () => {
    const { fixture, component } = await setup({ mode: 'view', id: 2 });
    http.expectOne(`${API}/purchase-return/2`).flush(RETURN);
    flushProduct();
    flushVendor();
    await fixture.whenStable();

    expect(component.readonly()).toBe(true);
    expect(component.entryNo()).toBe('|PR-000002');
    expect(component.refOptions()).toEqual([{ id: 3, name: 'PE-000003' }]);
    expect(component.batchLabel(component.lines()[0])).toBe('B1');
    expect(component.lineColumns().map(column => column.key)).not.toContain('stock');
    expect(component.summary().net).toBe(226);

    component.startEdit();
    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/purchase-return/2` });
    const body = req.request.body as PurchaseReturnPayload;
    expect(body.ref_purchase_id).toBe(3);
    expect(body.purchaseReturnEntries[0]).toMatchObject({ id: 4, batch_id: 1, quantity: 5 });
    req.flush({ success: true, message: 'Purchase Return Updated successfully', errorCode: 0, timestamp: 0, post_data_id: 2 });
  });

  it('does not post an incomplete return', async () => {
    const { component } = await setup();
    http.expectOne(`${API}/purchase-return/generateNumber`).flush('|PR-000003');
    component.save();
    http.expectNone(`${API}/purchase-return`);
    expect(component.form.controls.vendor_id.touched).toBe(true);
  });
});
