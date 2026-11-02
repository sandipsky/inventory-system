import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { toIsoDate } from '../../../shared/utils/date';
import { Ledger } from '../report.model';
import { startOfMonth } from '../report-table';
import { LedgerReport } from './ledger-report';

const CASH: Ledger = {
  account_id: 3,
  account_name: 'Cash',
  opening_balance: 50000,
  total_debit: 1500,
  total_credit: 52000,
  closing_balance: -500,
  rows: [
    { date: '2026-10-31', system_entry_no: '|P-000001', narration: 'Payment received', debit_amount: 1500, credit_amount: 0, balance: 51500 },
    { date: '2026-10-31', system_entry_no: '|P-000002', narration: null, debit_amount: 0, credit_amount: 52000, balance: -500 },
  ],
};

describe('LedgerReport', () => {
  let component: LedgerReport;
  let fixture: ComponentFixture<LedgerReport>;
  let http: HttpTestingController;

  async function setup(queryParams: Record<string, string> = {}) {
    await TestBed.configureTestingModule({
      imports: [LedgerReport],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LedgerReport);
    component = fixture.componentInstance;
    await fixture.whenStable();
    http.expectOne(`${environment.apiUrl}/dropdown/accountMaster/all/all/all`).flush([{ id: 3, name: 'Cash' }]);
  }

  function ledgerRequest(accountId: number): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === `${environment.apiUrl}/reports/accounting/ledger/${accountId}`);
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).querySelector('l-table')?.textContent?.replace(/\s+/g, ' ') ?? '';
  }

  it('waits for an account, then loads its ledger for this month so far', async () => {
    await setup();
    TestBed.tick();
    http.expectNone(req => req.url.includes('/reports/'));
    expect(component.emptyText()).toBe('Pick an account to see its ledger.');

    component.accountId.set(3);
    const req = ledgerRequest(3);
    expect(req.request.params.get('fromDate')).toBe(toIsoDate(startOfMonth()));
    expect(req.request.params.get('toDate')).toBe(toIsoDate(new Date()));
    req.flush(CASH);
    await fixture.whenStable();

    expect(component.tableRows().map(row => row.kind)).toEqual(['opening', 'line', 'line', 'total']);
    expect(text()).toContain('Opening Balance');
    expect(text()).toContain('50,000.00 Dr');
    expect(text()).toContain('P-000002');
    expect(text()).toContain('500.00 Cr');
  });

  it('opens on the account and dates of a link, a missing date meaning no limit', async () => {
    await setup({ account: '3', toDate: '2026-10-31' });

    expect(component.accountId()).toBe(3);
    expect(component.fromDate()).toBeNull();
    const req = ledgerRequest(3);
    expect(req.request.params.has('fromDate')).toBe(false);
    expect(req.request.params.get('toDate')).toBe('2026-10-31');
    req.flush(CASH);
  });

  it("shows the API's message when the ledger fails", async () => {
    await setup({ account: '99' });
    ledgerRequest(99).flush({ success: false, message: 'Account not found' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(component.ledger()).toBeNull();
    expect(component.emptyText()).toBe('Account not found');
  });
});
