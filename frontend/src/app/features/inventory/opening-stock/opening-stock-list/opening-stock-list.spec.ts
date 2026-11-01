import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { StockBatch } from '../../inventory.model';
import { OpeningStockList } from './opening-stock-list';

const ROWS: StockBatch[] = [
  {
    id: 4, product_id: 31, product_name: 'Coca-Cola 500ml', batch_id: 4, batch_no: 'B1', expiry_date: '2027-01-31',
    quantity: 10, cost_price: 40, selling_price: 50, mrp: 55,
  },
  {
    id: 3, product_id: 31, product_name: 'Coca-Cola 500ml', batch_id: 0, batch_no: null, expiry_date: null,
    quantity: 7, cost_price: 42, selling_price: 52, mrp: 57,
  },
];

describe('OpeningStockList', () => {
  let component: OpeningStockList;
  let fixture: ComponentFixture<OpeningStockList>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/opening-stock`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpeningStockList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewOpeningStock', 'CreateOpeningStock'] }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OpeningStockList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === url);
  }

  it('loads the newest batches first and names the default batch', async () => {
    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('id:desc');
    expect(req.request.params.has('fromDate')).toBe(false);

    req.flush({ content: ROWS, totalElements: 2, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(component.rows()).toEqual(ROWS);
    const cells = [...(fixture.nativeElement as HTMLElement).querySelectorAll('l-table tbody tr')].map(row =>
      row.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(cells[0]).toContain('B1');
    expect(cells[1]).toContain('Default batch');
  });

  it('searches by product name and sorts by the backend field', () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });

    component.sort.set({ key: 'cost_price', direction: 'desc' });
    component.onFilterChange([{ field: 'product.name', value: 'coca', displayValue: 'coca' }]);

    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('costPrice:desc');
    expect(req.request.params.get('product.name')).toBe('coca');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('shows Add only with the create permission', async () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    const addButton = () =>
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('l-button')].some(b =>
        b.textContent?.includes('Add Opening Stock'),
      );
    expect(addButton()).toBe(true);

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewOpeningStock'] }));
    await fixture.whenStable();
    expect(addButton()).toBe(false);
  });
});
