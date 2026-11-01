import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { toIsoDate } from '../../../../shared/utils/date';
import { Journal } from '../journal.model';
import { JournalList } from './journal-list';

const ROW: Journal = {
  id: 5,
  date: '2026-10-31',
  system_entry_no: '|J-000005',
  remarks: 'Office supplies',
  journalEntries: [
    { account_master_id: 8, account_master_name: 'Printing and Stationary', debit_amount: 300, credit_amount: 0, narration: null },
    { account_master_id: 9, account_master_name: 'Fuel Expenses', debit_amount: 200, credit_amount: 0, narration: null },
    { account_master_id: 3, account_master_name: 'Cash', debit_amount: 0, credit_amount: 500, narration: null },
  ],
};

describe('JournalList', () => {
  let component: JournalList;
  let fixture: ComponentFixture<JournalList>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/journal`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JournalList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewJournalEntries', 'CreateJournalEntry'] }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(JournalList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === url);
  }

  it("loads today's journals, newest first, with their accounts and total", async () => {
    const req = nextRequest();
    const today = toIsoDate(new Date());
    expect(req.request.params.get('fromDate')).toBe(today);
    expect(req.request.params.get('toDate')).toBe(today);
    expect(req.request.params.get('sort')).toBe('id:desc');

    req.flush({ content: [ROW], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(component.rows()).toEqual([ROW]);
    expect(component.amountOf(ROW)).toBe(500);
    expect(component.sidesOf(ROW)).toEqual({ debit: 'Printing and Stationary, Fuel Expenses', credit: 'Cash' });
    const link = (fixture.nativeElement as HTMLElement).querySelector('l-table .link');
    expect(link?.textContent?.trim()).toBe('J-000005');
  });

  it('searches the remarks and sorts by the backend field', () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });

    component.sort.set({ key: 'system_entry_no', direction: 'asc' });
    component.onFilterChange([{ field: 'remarks', value: 'fuel', displayValue: 'fuel' }]);

    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('systemEntryNo:asc');
    expect(req.request.params.get('remarks')).toBe('fuel');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('shows Add only with the create permission', async () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    const addButton = () =>
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('l-button')].some(b =>
        b.textContent?.includes('Add Journal Entry'),
      );
    expect(addButton()).toBe(true);

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewJournalEntries'] }));
    await fixture.whenStable();
    expect(addButton()).toBe(false);
  });
});
