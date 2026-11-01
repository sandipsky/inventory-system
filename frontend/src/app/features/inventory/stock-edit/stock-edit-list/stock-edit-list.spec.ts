import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { StockBatch } from '../../inventory.model';
import { StockEditList } from './stock-edit-list';

const ROW: StockBatch = {
  id: 4, product_id: 31, product_name: 'Coca-Cola 500ml', batch_id: 4, batch_no: 'B1', expiry_date: '2027-01-31',
  quantity: 10, cost_price: 40, selling_price: 50, mrp: 55,
};

describe('StockEditList', () => {
  let component: StockEditList;
  let fixture: ComponentFixture<StockEditList>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/stock-edit`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockEditList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewStockEdit', 'EditStockEdit'] }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StockEditList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === url);
  }

  it("lists batches by product, each product's batches together", async () => {
    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('product.name:asc,id:asc');
    req.flush({ content: [ROW], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    const link = (fixture.nativeElement as HTMLElement).querySelector('l-table .link');
    expect(link?.textContent?.trim()).toBe('Coca-Cola 500ml');
  });

  it('filters by batch number and sorts by the backend field', () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });

    component.sort.set({ key: 'expiry_date', direction: 'asc' });
    component.onFilterChange([{ field: 'batchNo', value: 'B1', displayValue: 'B1' }]);

    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('expiryDate:asc');
    expect(req.request.params.get('batchNo')).toBe('B1');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('offers Edit only with the edit permission', async () => {
    nextRequest().flush({ content: [ROW], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();
    expect(component.columns().map(column => column.key)).toContain('actions');

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewStockEdit'] }));
    await fixture.whenStable();
    expect(component.columns().map(column => column.key)).not.toContain('actions');
    expect((fixture.nativeElement as HTMLElement).querySelector('l-table .link')).toBeNull();
  });
});
