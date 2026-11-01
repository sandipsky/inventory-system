import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DRAWER_DATA, DrawerRef } from '@lumen-ui/angular';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { BatchStock, Product } from '../../../../shared/models/product.model';
import { StockAdjustment, StockAdjustmentFormData, StockAdjustmentPayload } from '../../inventory.model';
import { StockAdjustmentForm } from './stock-adjustment-form';

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

const ADJUSTMENT: StockAdjustment = {
  id: 1,
  date: '2026-10-31',
  system_entry_no: '|SA-000001',
  remarks: 'Monthly stock count',
  stockAdjustmentEntries: [
    {
      id: 1, product_id: 31, product_name: 'Coca-Cola 500ml', batch_id: 1, batch_no: 'B1',
      adjustment_type: 'Out', quantity: 3, reason: 'Broken bottles',
    },
    {
      id: 2, product_id: 31, product_name: 'Coca-Cola 500ml', batch_id: 0, batch_no: null,
      adjustment_type: 'In', quantity: 1, reason: null,
    },
  ],
};

describe('StockAdjustmentForm', () => {
  let http: HttpTestingController;

  async function setup(data?: StockAdjustmentFormData) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [StockAdjustmentForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data ?? null },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['EditStockAdjustment'] }));
    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<StockAdjustmentForm> = TestBed.createComponent(StockAdjustmentForm);
    http.expectOne(`${API}/dropdown/products/inventory/all/active`).flush([{ id: 31, name: 'Coca-Cola 500ml' }]);
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  function flushProduct() {
    http.expectOne(`${API}/products/31`).flush(PRODUCT);
    http.expectOne(`${API}/products/stockInfo/31`).flush(BATCHES);
  }

  afterEach(() => http.verify());

  it('starts an add form with one empty line and the next number', async () => {
    const { fixture, component } = await setup();
    http.expectOne(`${API}/stock-adjustment/generateNumber`).flush('|SA-000002');
    await fixture.whenStable();

    expect(component.heading().title).toBe('Add Stock Adjustment');
    expect(component.lines().length).toBe(1);
    expect(component.entryNo()).toBe('|SA-000002');
    expect(component.lineColumns().map(column => column.key)).toContain('stock');
  });

  it('picks the first batch in stock for a product, then posts the line', async () => {
    const { component, drawerRef } = await setup();
    http.expectOne(`${API}/stock-adjustment/generateNumber`).flush('|SA-000002');

    const line = component.lines()[0];
    line.controls.product_id.setValue(31);
    component.onProductChange(line, 31);
    flushProduct();

    // B1 expires; the default batch has no date, so it goes last.
    expect(line.getRawValue()).toMatchObject({ batch_id: 1, batch_no: 'B1' });
    expect(component.batchItems(line)).toEqual([
      { id: 0, name: 'Default batch · 7 in stock' },
      { id: 1, name: 'B1 · 15 in stock' },
    ]);
    expect(component.batchOf(line)?.available_quantity).toBe(15);

    line.patchValue({ adjustment_type: 'Out', quantity: 2, reason: '  Expired ' });
    component.form.controls.remarks.setValue('Shelf check');
    component.save();

    const req = http.expectOne({ method: 'POST', url: `${API}/stock-adjustment` });
    const body = req.request.body as StockAdjustmentPayload;
    expect(body.remarks).toBe('Shelf check');
    expect(body.stockAdjustmentEntries).toEqual([
      { id: undefined, product_id: 31, batch_id: 1, adjustment_type: 'Out', quantity: 2, reason: 'Expired' },
    ]);
    req.flush({ success: true, message: 'Stock Adjustment Added successfully', errorCode: 0, timestamp: 0, post_data_id: 2 });
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('opens read-only in view mode, then edits with PUT keeping line ids', async () => {
    const { fixture, component } = await setup({ mode: 'view', id: 1 });
    http.expectOne(`${API}/stock-adjustment/1`).flush(ADJUSTMENT);
    flushProduct();
    await fixture.whenStable();

    expect(component.readonly()).toBe(true);
    expect(component.entryNo()).toBe('|SA-000001');
    expect(component.lines().map(line => component.batchLabel(line))).toEqual(['B1', 'Default batch']);
    expect(component.lineColumns().map(column => column.key)).not.toContain('stock');

    component.startEdit();
    component.lines()[0].controls.quantity.setValue(4);
    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/stock-adjustment/1` });
    const body = req.request.body as StockAdjustmentPayload;
    expect(body.date).toBe('2026-10-31');
    expect(body.stockAdjustmentEntries).toEqual([
      { id: 1, product_id: 31, batch_id: 1, adjustment_type: 'Out', quantity: 4, reason: 'Broken bottles' },
      { id: 2, product_id: 31, batch_id: 0, adjustment_type: 'In', quantity: 1, reason: null },
    ]);
    req.flush({ success: true, message: 'Stock Adjustment Updated successfully', errorCode: 0, timestamp: 0, post_data_id: 1 });
  });

  it('does not post a line without a direction', async () => {
    const { component } = await setup();
    http.expectOne(`${API}/stock-adjustment/generateNumber`).flush('|SA-000002');
    component.lines()[0].patchValue({ product_id: 31, batch_id: 0, quantity: 1 });
    component.save();
    http.expectNone(`${API}/stock-adjustment`);
    expect(component.lines()[0].controls.adjustment_type.touched).toBe(true);
  });

  it('does not post without lines', async () => {
    const { component } = await setup();
    http.expectOne(`${API}/stock-adjustment/generateNumber`).flush('|SA-000002');
    component.removeLine(component.lines()[0]);
    component.save();
    http.expectNone(`${API}/stock-adjustment`);
  });
});
