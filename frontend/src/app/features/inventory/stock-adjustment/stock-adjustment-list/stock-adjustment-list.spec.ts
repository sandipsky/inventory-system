import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { toIsoDate } from '../../../../shared/utils/date';
import { StockAdjustment } from '../../inventory.model';
import { StockAdjustmentList } from './stock-adjustment-list';

const ROW: StockAdjustment = {
  id: 1,
  date: '2026-10-31',
  system_entry_no: '|SA-000001',
  remarks: 'Monthly stock count',
  stockAdjustmentEntries: null,
};

describe('StockAdjustmentList', () => {
  let component: StockAdjustmentList;
  let fixture: ComponentFixture<StockAdjustmentList>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/stock-adjustment`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockAdjustmentList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewStockAdjustment', 'CreateStockAdjustment'] }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StockAdjustmentList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === url);
  }

  it("loads today's adjustments, newest first", async () => {
    const req = nextRequest();
    const today = toIsoDate(new Date());
    expect(req.request.params.get('fromDate')).toBe(today);
    expect(req.request.params.get('toDate')).toBe(today);
    expect(req.request.params.get('sort')).toBe('id:desc');

    req.flush({ content: [ROW], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(component.rows()).toEqual([ROW]);
    const link = (fixture.nativeElement as HTMLElement).querySelector('l-table .link');
    expect(link?.textContent?.trim()).toBe('SA-000001');
  });

  it('searches the remarks and sorts by the backend field', () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });

    component.sort.set({ key: 'system_entry_no', direction: 'asc' });
    component.onFilterChange([{ field: 'remarks', value: 'count', displayValue: 'count' }]);

    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('systemEntryNo:asc');
    expect(req.request.params.get('remarks')).toBe('count');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('shows Add only with the create permission', async () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    const addButton = () =>
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('l-button')].some(b =>
        b.textContent?.includes('Add Stock Adjustment'),
      );
    expect(addButton()).toBe(true);

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewStockAdjustment'] }));
    await fixture.whenStable();
    expect(addButton()).toBe(false);
  });
});
