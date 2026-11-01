import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DRAWER_DATA, DrawerRef } from '@lumen-ui/angular';
import { environment } from '../../../../../environments/environment';
import { OpeningStockPayload } from '../../inventory.model';
import { OpeningStockForm } from './opening-stock-form';

const API = environment.apiUrl;
const SAVED = { success: true, message: 'Opening Stock Added successfully', errorCode: 0, timestamp: 0, post_data_id: 9 };

describe('OpeningStockForm', () => {
  let http: HttpTestingController;

  async function setup() {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [OpeningStockForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: { calendar: 'ad' } },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<OpeningStockForm> = TestBed.createComponent(OpeningStockForm);
    http.expectOne(`${API}/dropdown/products/inventory/all/active`).flush([{ id: 31, name: 'Coca-Cola 500ml' }]);
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  afterEach(() => http.verify());

  it("fills in the picked product's prices and posts the batch", async () => {
    const { component, drawerRef } = await setup();
    expect(component.productOptions()).toEqual([{ id: 31, name: 'Coca-Cola 500ml' }]);

    component.form.controls.product_id.setValue(31);
    component.onProductChange(31);
    http.expectOne(`${API}/products/31`).flush({ id: 31, cost_price: 40, selling_price: 50, mrp: 55 });
    expect(component.form.getRawValue()).toMatchObject({ cost_price: 40, selling_price: 50, mrp: 55 });

    component.form.patchValue({ batch_no: ' B1 ', expiry_date: new Date(2027, 0, 31), quantity: 10 });
    component.save();

    const req = http.expectOne({ method: 'POST', url: `${API}/opening-stock` });
    expect(req.request.body as OpeningStockPayload).toEqual({
      product_id: 31,
      batch_no: 'B1',
      expiry_date: '2027-01-31',
      quantity: 10,
      cost_price: 40,
      selling_price: 50,
      mrp: 55,
    });
    req.flush(SAVED);
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('sends a blank batch as the default batch', async () => {
    const { component } = await setup();
    component.form.patchValue({ product_id: 31, quantity: 5, cost_price: 42 });
    component.save();

    const req = http.expectOne({ method: 'POST', url: `${API}/opening-stock` });
    expect(req.request.body).toMatchObject({ batch_no: null, expiry_date: null, selling_price: 0, mrp: 0 });
    req.flush(SAVED);
  });

  it('does not post without a product, quantity and cost price', async () => {
    const { component } = await setup();
    component.save();
    http.expectNone(`${API}/opening-stock`);
    expect(component.form.controls.product_id.touched).toBe(true);
  });

  it('stays open when the batch already has stock', async () => {
    const { component, drawerRef } = await setup();
    component.form.patchValue({ product_id: 31, quantity: 5, cost_price: 42 });
    component.save();
    http
      .expectOne({ method: 'POST', url: `${API}/opening-stock` })
      .flush(
        { message: 'Stock already exists for this product batch. Use Stock Adjustment or Stock Edit instead.' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(drawerRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBe(false);
  });
});
