import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';
import { testUser } from '../../../auth/auth.testing';
import { ProductDetail } from '../../../shared/models/product.model';
import { ProductList } from './product-list';

const API = environment.apiUrl;

const ROW: ProductDetail = {
  id: 31,
  name: 'Coca-Cola 500ml',
  code: 'BEV-001',
  barcode: '8901000000011',
  remarks: null,
  cost_price: 40,
  selling_price: 50,
  mrp: 55,
  max_stock: 500,
  min_stock: 20,
  valuation_method: 'FIFO',
  category_id: 6,
  category_name: 'Beverages',
  unit_id: 6,
  unit_name: 'Pcs',
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
  bonus_infos: [],
};

describe('ProductList', () => {
  let component: ProductList;
  let fixture: ComponentFixture<ProductList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewProduct', 'CreateProduct'] }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProductList);
    component = fixture.componentInstance;
    http.expectOne(`${API}/dropdown/category/all`).flush([{ id: 6, name: 'Beverages' }]);
    http.expectOne(`${API}/dropdown/units/all`).flush([{ id: 6, name: 'Pcs' }]);
    await fixture.whenStable();
  });

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === `${API}/products`);
  }

  it('loads the first page, newest first', async () => {
    const req = nextRequest();
    expect(req.request.params.get('pageIndex')).toBe('0');
    expect(req.request.params.get('pageSize')).toBe('10');
    expect(req.request.params.get('sort')).toBe('id:desc');

    req.flush({ content: [ROW], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(component.rows()).toEqual([ROW]);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('l-table .link')?.textContent?.trim()).toBe('Coca-Cola 500ml');
    expect(el.querySelector('l-table .muted')?.textContent?.trim()).toBe('BEV-001');
  });

  it('filters category and unit by name', () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    const category = component.filterColumns().find(column => column.formcontrolName === 'category.name');
    expect(category?.data).toEqual([{ id: 'Beverages', name: 'Beverages' }]);
  });

  it('sorts by the backend field and filters from page one', () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });

    component.pageIndex.set(2);
    component.sort.set({ key: 'category_name', direction: 'asc' });
    component.onFilterChange([{ field: 'productType', value: 'sellable', displayValue: 'Sellable' }]);

    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('category.name:asc');
    expect(req.request.params.get('productType')).toBe('sellable');
    expect(req.request.params.get('pageIndex')).toBe('0');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('lists service items as Service first', () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    expect(component.typesOf(ROW)).toEqual(['Purchasable', 'Sellable']);
    expect(component.typesOf({ ...ROW, service_item: true, product_types: ['Sellable'] })).toEqual(['Service', 'Sellable']);
  });

  it('shows Add only with the create permission', async () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    const addButton = () =>
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('l-button')].some(b =>
        b.textContent?.includes('Add Product'),
      );
    expect(addButton()).toBe(true);

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewProduct'] }));
    await fixture.whenStable();
    expect(addButton()).toBe(false);
  });
});
