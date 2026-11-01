import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { toIsoDate } from '../../../../shared/utils/date';
import { Purchase } from '../../purchase.model';
import { PurchaseEntryList } from './purchase-entry-list';

const ROW: Purchase = {
  id: 5,
  date: '2026-10-30',
  bill_date: '2026-10-29',
  bill_no: 'INV-1',
  system_entry_no: '|PE-000005',
  transaction_type: 'Credit',
  vendor_id: 1,
  vendor_name: 'ABC Suppliers',
  discount_type: 'Percentage',
  discount: 10,
  sub_total: 1000,
  non_taxable_amount: 0,
  taxable_amount: 900,
  tax: 117,
  rounded: false,
  rounding: 0,
  grand_total: 1017,
  remarks: null,
  purchaseEntries: [],
};

describe('PurchaseEntryList', () => {
  let component: PurchaseEntryList;
  let fixture: ComponentFixture<PurchaseEntryList>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/purchase`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseEntryList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewPurchaseEntry', 'CreatePurchaseEntry'] }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PurchaseEntryList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === url);
  }

  it('loads the first page of today, newest first', async () => {
    const req = nextRequest();
    const today = toIsoDate(new Date());
    expect(req.request.params.get('pageIndex')).toBe('0');
    expect(req.request.params.get('pageSize')).toBe('10');
    expect(req.request.params.get('sort')).toBe('id:desc');
    expect(req.request.params.get('fromDate')).toBe(today);
    expect(req.request.params.get('toDate')).toBe(today);

    req.flush({ content: [ROW], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(component.rows()).toEqual([ROW]);
    expect(component.total()).toBe(1);
    expect(component.loading()).toBe(false);
    const link = (fixture.nativeElement as HTMLElement).querySelector('l-table .link');
    expect(link?.textContent?.trim()).toBe('PE-000005');
  });

  it('derives the discount amount from the totals', () => {
    expect(component.discountOf(ROW)).toBe(100);
  });

  it('sorts by the backend field and filters from page one', async () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });

    component.pageIndex.set(2);
    component.sort.set({ key: 'vendor_name', direction: 'asc' });
    component.onFilterChange([{ field: 'vendor.name', value: 'abc', displayValue: 'abc' }]);

    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('vendor.name:asc');
    expect(req.request.params.get('vendor.name')).toBe('abc');
    expect(req.request.params.get('pageIndex')).toBe('0');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('shows the server message when loading fails', async () => {
    nextRequest().flush({ message: 'Operation not allowed' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    expect(component.emptyText()).toBe('Operation not allowed');
  });

  it('shows Add only with the create permission', async () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    const addButton = () =>
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('l-button')].some(b =>
        b.textContent?.includes('Add Purchase Invoice'),
      );
    expect(addButton()).toBe(true);

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewPurchaseEntry'] }));
    await fixture.whenStable();
    expect(addButton()).toBe(false);
  });
});
