import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DRAWER_DATA, DrawerRef } from '@lumen-ui/angular';
import { environment } from '../../../../../environments/environment';
import { StockBatch, StockEditFormData } from '../../inventory.model';
import { StockEditForm } from './stock-edit-form';

const API = environment.apiUrl;
const SAVED = { success: true, message: 'Stock Updated successfully', errorCode: 0, timestamp: 0, post_data_id: 4 };

const BATCH: StockBatch = {
  id: 4, product_id: 31, product_name: 'Coca-Cola 500ml', batch_id: 4, batch_no: 'B1', expiry_date: '2027-01-31',
  quantity: 10, cost_price: 40, selling_price: 50, mrp: 55,
};

describe('StockEditForm', () => {
  let http: HttpTestingController;

  async function setup(data: StockEditFormData) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [StockEditForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<StockEditForm> = TestBed.createComponent(StockEditForm);
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  afterEach(() => http.verify());

  it("starts from the batch's figures and overwrites them by product and batch id", async () => {
    const { fixture, component, drawerRef } = await setup({ batch: BATCH });
    expect(component.form.getRawValue()).toEqual({
      quantity: 10,
      expiry_date: new Date(2027, 0, 31),
      cost_price: 40,
      selling_price: 50,
      mrp: 55,
    });
    expect((fixture.nativeElement as HTMLElement).querySelector('.record')?.textContent).toContain('B1');

    component.form.patchValue({ quantity: 100, cost_price: 42 });
    component.save();

    const req = http.expectOne({ method: 'PUT', url: `${API}/stock-edit/31/4` });
    expect(req.request.body).toEqual({
      quantity: 100,
      cost_price: 42,
      selling_price: 50,
      mrp: 55,
      expiry_date: '2027-01-31',
    });
    req.flush(SAVED);
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('addresses the default batch as batch 0 and can clear its expiry date', async () => {
    const { fixture, component } = await setup({ batch: { ...BATCH, batch_id: 0, batch_no: null } });
    expect((fixture.nativeElement as HTMLElement).querySelector('.record')?.textContent).toContain('Default batch');

    component.form.controls.expiry_date.setValue(null);
    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/stock-edit/31/0` });
    expect(req.request.body).toMatchObject({ expiry_date: null });
    req.flush(SAVED);
  });

  it('does not save a negative or missing quantity', async () => {
    const { component } = await setup({ batch: BATCH });
    component.form.controls.quantity.setValue(null);
    component.save();
    http.expectNone(`${API}/stock-edit/31/4`);
    expect(component.form.controls.quantity.touched).toBe(true);
  });
});
