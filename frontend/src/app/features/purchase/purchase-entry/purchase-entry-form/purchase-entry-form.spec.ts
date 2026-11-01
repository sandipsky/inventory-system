import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DRAWER_DATA, DrawerRef } from '@lumen-ui/angular';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { Product } from '../../../../shared/models/product.model';
import { Purchase, PurchaseFormData, PurchasePayload } from '../../purchase.model';
import { PurchaseEntryForm } from './purchase-entry-form';

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

const PURCHASE: Purchase = {
  id: 7,
  date: '2026-10-30',
  bill_date: '2026-10-29',
  bill_no: 'INV-5501',
  system_entry_no: '|PE-000007',
  transaction_type: 'Credit',
  vendor_id: 6,
  vendor_name: 'ABC Suppliers',
  discount_type: 'Flat',
  discount: 0,
  sub_total: 4800,
  non_taxable_amount: 0,
  taxable_amount: 4800,
  tax: 624,
  rounded: false,
  rounding: 0,
  grand_total: 5424,
  remarks: 'October stock',
  purchaseEntries: [
    {
      id: 1, product_id: 31, product_name: 'Coca-Cola 500ml', batch_id: 1, batch_no: 'B1',
      expiry_date: '2027-01-31', quantity: 120, cost_price: 40, selling_price: 50, mrp: 55,
    },
  ],
};

describe('PurchaseEntryForm', () => {
  let http: HttpTestingController;

  function toolLabels(fixture: ComponentFixture<PurchaseEntryForm>): string[] {
    const el: HTMLElement = fixture.nativeElement;
    return [...el.querySelectorAll('.head .tools .tool')].map(tool => tool.textContent?.trim() ?? '');
  }

  async function setup(data?: PurchaseFormData) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PurchaseEntryForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data ?? null },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['EditPurchaseEntry'] }));
    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<PurchaseEntryForm> = TestBed.createComponent(PurchaseEntryForm);
    http.expectOne(`${API}/dropdown/vendor/active`).flush([{ id: 6, name: 'ABC Suppliers' }]);
    http.expectOne(`${API}/dropdown/products/inventory/purchasable/active`).flush([{ id: 31, name: 'Coca-Cola 500ml' }]);
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  afterEach(() => http.verify());

  it('starts an add form with one empty line and the next number', async () => {
    const { fixture, component } = await setup();
    http.expectOne(`${API}/purchase/generateNumber`).flush('|PE-000008');
    await fixture.whenStable();

    expect(component.mode()).toBe('add');
    expect(component.title()).toBe('Add Purchase Invoice');
    expect(component.readonly()).toBe(false);
    expect(component.lines().length).toBe(1);
    expect(component.entryNo()).toBe('|PE-000008');
    expect(toolLabels(fixture)).toEqual([]);
  });

  it('prices a picked product, totals the invoice and posts it', async () => {
    const { fixture, component, drawerRef } = await setup();
    http.expectOne(`${API}/purchase/generateNumber`).flush('|PE-000008');

    const line = component.lines()[0];
    line.controls.product_id.setValue(31);
    component.onProductChange(line, 31);
    http.expectOne(`${API}/products/31`).flush(PRODUCT);
    expect(line.controls.cost_price.value).toBe(40);

    line.controls.quantity.setValue(120);
    component.form.patchValue({
      vendor_id: 6,
      bill_no: ' INV-5501 ',
      bill_date: new Date(2026, 9, 29),
      transaction_type: 'Credit',
      rounded: false,
    });
    http.expectOne(`${API}/vendor/6`).flush({ id: 6, name: 'ABC Suppliers', registration_number: 'R1', contact: null, address: null, email: null });
    await fixture.whenStable();

    expect(component.summary()).toMatchObject({ gross: 4800, taxable: 4800, tax: 624, net: 5424 });

    component.save();
    const req = http.expectOne({ method: 'POST', url: `${API}/purchase` });
    const body = req.request.body as PurchasePayload;
    expect(body).toMatchObject({
      bill_no: 'INV-5501',
      bill_date: '2026-10-29',
      vendor_id: 6,
      transaction_type: 'Credit',
      sub_total: 4800,
      taxable_amount: 4800,
      tax: 624,
      grand_total: 5424,
    });
    expect(body.purchaseEntries).toEqual([
      expect.objectContaining({ product_id: 31, quantity: 120, cost_price: 40, selling_price: 50, mrp: 55, batch_no: null }),
    ]);
    req.flush({ success: true, message: 'Purchase Added successfully', errorCode: 0, timestamp: 0, post_data_id: 9 });
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('does not post an incomplete invoice', async () => {
    const { component } = await setup();
    http.expectOne(`${API}/purchase/generateNumber`).flush('|PE-000008');
    component.save();
    http.expectNone(`${API}/purchase`);
    expect(component.form.controls.vendor_id.touched).toBe(true);
  });

  it('opens read-only in view mode with the saved purchase, and switches to edit', async () => {
    const { fixture, component } = await setup({ mode: 'view', id: 7 });
    http.expectOne(`${API}/purchase/7`).flush(PURCHASE);
    http.expectOne(`${API}/products/31`).flush(PRODUCT);
    http.expectOne(`${API}/vendor/6`).flush({ id: 6, name: 'ABC Suppliers', registration_number: null, contact: null, address: null, email: null });
    await fixture.whenStable();

    expect(component.readonly()).toBe(true);
    expect(component.entryNo()).toBe('|PE-000007');
    expect(component.lines()[0].controls.batch_no.value).toBe('B1');
    expect(component.summary().net).toBe(5424);
    expect(toolLabels(fixture)).toEqual(['Print', 'Export']);

    component.startEdit();
    await fixture.whenStable();
    expect(component.mode()).toBe('edit');
    expect(component.title()).toBe('Edit Purchase Invoice');
    expect(toolLabels(fixture)).toEqual([]);
  });

  it('updates with PUT, keeping line ids', async () => {
    const { fixture, component } = await setup({ mode: 'edit', id: 7 });
    http.expectOne(`${API}/purchase/7`).flush(PURCHASE);
    http.expectOne(`${API}/products/31`).flush(PRODUCT);
    http.expectOne(`${API}/vendor/6`).flush({ id: 6, name: 'ABC Suppliers', registration_number: null, contact: null, address: null, email: null });
    await fixture.whenStable();

    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/purchase/7` });
    expect((req.request.body as PurchasePayload).purchaseEntries[0].id).toBe(1);
    req.flush({ success: true, message: 'Purchase Updated successfully', errorCode: 0, timestamp: 0, post_data_id: 7 });
  });

  it('closes the drawer without a result on cancel', async () => {
    const { component, drawerRef } = await setup();
    http.expectOne(`${API}/purchase/generateNumber`).flush('|PE-000008');
    component.close();
    expect(drawerRef.close).toHaveBeenCalledWith(false);
  });
});
