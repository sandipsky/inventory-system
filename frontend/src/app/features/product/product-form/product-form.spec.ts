import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DRAWER_DATA, DrawerRef } from '@lumen-ui/angular';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';
import { testUser } from '../../../auth/auth.testing';
import { ProductDetail, ProductPayload } from '../../../shared/models/product.model';
import { ProductFormData } from '../product.model';
import { ProductForm } from './product-form';

const API = environment.apiUrl;
const SAVED = { success: true, message: 'Product Added successfully', errorCode: 0, timestamp: 0, post_data_id: 31 };

const PRODUCT: ProductDetail = {
  id: 31,
  name: 'Coca-Cola 500ml',
  code: 'BEV-001',
  barcode: null,
  remarks: 'Cold drink',
  cost_price: 40,
  selling_price: 50,
  mrp: 55,
  max_stock: 500,
  min_stock: 20,
  valuation_method: 'FIFO',
  category_id: 6,
  category_name: 'Beverages',
  // Inactive, so the active-only dropdown no longer lists it.
  unit_id: 9,
  unit_name: 'Crate',
  packing_id: null,
  packing_name: null,
  tax_type_id: 1,
  tax_type_name: 'VAT 13%',
  tax_rate: 13,
  is_active: true,
  purchasable: true,
  sellable: true,
  service_item: false,
  is_batch_available: false,
  has_expiry_date: true,
  has_manufacturing_date: false,
  product_types: ['Purchasable', 'Sellable'],
  bonus_infos: [{ id: 61, min_quantity: 24, bonus_quantity: 1 }],
};

describe('ProductForm', () => {
  let http: HttpTestingController;

  async function setup(data?: ProductFormData) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ProductForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data ?? null },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['EditProduct'] }));
    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<ProductForm> = TestBed.createComponent(ProductForm);
    http.expectOne(`${API}/dropdown/category/active`).flush([{ id: 6, name: 'Beverages' }]);
    http.expectOne(`${API}/dropdown/units/active`).flush([{ id: 6, name: 'Pcs' }]);
    http.expectOne(`${API}/dropdown/packings/active`).flush([]);
    http.expectOne(`${API}/dropdown/taxtypes/active`).flush([{ id: 1, name: 'VAT 13%' }]);
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  afterEach(() => http.verify());

  it('starts an empty add form with sensible defaults', async () => {
    const { fixture, component } = await setup();
    await fixture.whenStable();

    expect(component.mode()).toBe('add');
    expect(component.title()).toBe('Add Product');
    expect(component.form.getRawValue()).toMatchObject({
      valuation_method: 'FIFO',
      is_active: true,
      purchasable: true,
      sellable: true,
      service_item: false,
    });
    expect(component.bonuses()).toEqual([]);
  });

  it('posts a new product, sending blanks as null', async () => {
    const { component, drawerRef } = await setup();
    component.form.patchValue({ name: ' Sprite 500ml ', unit_id: 6, tax_type_id: 1, cost_price: 38 });
    component.addBonus();
    component.bonuses()[0].setValue({ min_quantity: 24, bonus_quantity: 2 });

    component.save();
    const req = http.expectOne({ method: 'POST', url: `${API}/products` });
    const body = req.request.body as ProductPayload;
    expect(body).toMatchObject({
      name: 'Sprite 500ml',
      code: null,
      barcode: null,
      category_id: null,
      unit_id: 6,
      tax_type_id: 1,
      valuation_method: 'FIFO',
      cost_price: 38,
      selling_price: null,
      remarks: null,
      purchasable: true,
      service_item: false,
    });
    expect(body.bonus_infos).toEqual([{ min_quantity: 24, bonus_quantity: 2 }]);
    req.flush(SAVED);
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('does not post without a name and unit, or with an empty bonus row', async () => {
    const { component } = await setup();
    component.save();
    http.expectNone(`${API}/products`);
    expect(component.form.controls.unit_id.touched).toBe(true);

    component.form.patchValue({ name: 'Sprite', unit_id: 6 });
    component.addBonus();
    component.save();
    http.expectNone(`${API}/products`);
  });

  it('does not post a minimum stock above the maximum', async () => {
    const { component } = await setup();
    component.form.patchValue({ name: 'Sprite', unit_id: 6, min_stock: 50, max_stock: 10 });
    component.save();
    http.expectNone(`${API}/products`);
  });

  it('opens read-only in view mode, keeps an inactive saved unit selectable, and switches to edit', async () => {
    const { fixture, component } = await setup({ mode: 'view', id: 31 });
    http.expectOne(`${API}/products/31`).flush(PRODUCT);
    await fixture.whenStable();

    expect(component.readonly()).toBe(true);
    expect(component.title()).toBe('Product');
    expect(component.form.controls.name.value).toBe('Coca-Cola 500ml');
    expect(component.unitOptions()).toEqual([{ id: 6, name: 'Pcs' }, { id: 9, name: 'Crate' }]);
    expect(component.bonuses()[0].getRawValue()).toEqual({ min_quantity: 24, bonus_quantity: 1 });
    expect(component.bonusColumns().some(column => column.key === 'actions')).toBe(false);

    component.startEdit();
    await fixture.whenStable();
    expect(component.mode()).toBe('edit');
    expect(component.title()).toBe('Edit Product');
  });

  it('updates with PUT', async () => {
    const { fixture, component } = await setup({ mode: 'edit', id: 31 });
    http.expectOne(`${API}/products/31`).flush(PRODUCT);
    await fixture.whenStable();

    component.form.controls.selling_price.setValue(52);
    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/products/31` });
    expect(req.request.body as ProductPayload).toMatchObject({ unit_id: 9, selling_price: 52, remarks: 'Cold drink' });
    req.flush({ ...SAVED, message: 'Product Updated successfully' });
  });

  it('closes the drawer without a result on cancel', async () => {
    const { component, drawerRef } = await setup();
    component.close();
    expect(drawerRef.close).toHaveBeenCalledWith(false);
  });
});
