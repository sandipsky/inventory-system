import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { toIsoDate } from '../../../shared/utils/date';
import { DocumentReportRow, PartyTotalRow, TrialBalanceRow } from '../report.model';
import { startOfMonth } from '../report-table';
import { ReportView } from './report-view';

const SALE: DocumentReportRow = {
  id: 1, date: '2026-10-31', system_entry_no: '|SI-000001', customer_name: 'Ram Traders', transaction_type: 'Cash',
  sub_total: 1000, discount: 0, non_taxable_amount: 0, taxable_amount: 1000, total_tax: 130, grand_total: 1130,
  is_cancelled: false,
};
const CANCELLED_SALE: DocumentReportRow = {
  ...SALE, id: 2, system_entry_no: '|SI-000002', customer_name: 'Hari Stores', grand_total: 565, is_cancelled: true,
};

const VENDORS: PartyTotalRow[] = [
  { vendor_id: 6, vendor_name: 'ABC Suppliers', entry_count: 1, sub_total: 4800, total_tax: 624, grand_total: 5424 },
  { vendor_id: 7, vendor_name: 'Zen Traders', entry_count: 3, sub_total: 9000, total_tax: 1170, grand_total: 10170 },
];

const CASH: TrialBalanceRow = {
  account_id: 3, account_code: 'C-001', account_name: 'Cash', account_type: 'Cash & Cash Equivalents',
  total_debit: 51726, total_credit: 2713, debit_balance: 49013, credit_balance: 0,
};

describe('ReportView', () => {
  let component: ReportView;
  let fixture: ComponentFixture<ReportView>;
  let http: HttpTestingController;

  async function setup(report: string) {
    await TestBed.configureTestingModule({
      imports: [ReportView],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { report } } } },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReportView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  function nextRequest(path: string): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === `${environment.apiUrl}/reports/${path}`);
  }

  function text(selector = 'l-table'): string {
    return (fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent?.replace(/\s+/g, ' ') ?? '';
  }

  it('loads the report for this month so far and adds it up, leaving cancelled sales out', async () => {
    await setup('sales');
    const req = nextRequest('sales');
    expect(req.request.params.get('fromDate')).toBe(toIsoDate(startOfMonth()));
    expect(req.request.params.get('toDate')).toBe(toIsoDate(new Date()));

    req.flush([SALE, CANCELLED_SALE]);
    await fixture.whenStable();

    expect(component.tableRows()).toHaveLength(3);
    expect(component.totals()['grand_total']).toBe(1130);
    expect(text()).toContain('SI-000001');
    expect(text()).not.toContain('|SI-000001');
    expect(text()).toContain('CANCELLED');
    expect(text()).toContain('Total');
    expect(text()).toContain('1,130.00');
    expect(text('app-list-card-footer')).toContain('2 rows · 1 cancelled, left out of the totals');
  });

  it('loads again when the dates change', async () => {
    await setup('purchase/vendor');
    nextRequest('purchase/vendor').flush(VENDORS);

    component.fromDate.set(null);
    const req = nextRequest('purchase/vendor');
    expect(req.request.params.has('fromDate')).toBe(false);
    expect(req.request.params.get('toDate')).toBe(toIsoDate(new Date()));
    req.flush([]);
  });

  it('searches and sorts on the page, keeping the totals row last', async () => {
    await setup('purchase/vendor');
    nextRequest('purchase/vendor').flush(VENDORS);
    await fixture.whenStable();

    component.sort.set({ key: 'grand_total', direction: 'desc' });
    expect(component.tableRows().map(row => row['vendor_name'])).toEqual(['Zen Traders', 'ABC Suppliers', undefined]);
    expect(component.totals()).toEqual({ entry_count: 4, sub_total: 13800, total_tax: 1794, grand_total: 15594 });

    component.search.set('abc');
    await fixture.whenStable();
    expect(component.totals()['grand_total']).toBe(5424);
    expect(text('app-list-card-footer')).toContain('1 of 2 rows match');

    component.search.set('nobody');
    await fixture.whenStable();
    expect(component.tableRows()).toEqual([]);
    expect(component.emptyText()).toBe('No rows match the search.');
  });

  it('sends only the as-of date for the trial balance and links each account to its ledger', async () => {
    await setup('accounting/trial-balance');
    const req = nextRequest('accounting/trial-balance');
    expect(req.request.params.has('fromDate')).toBe(false);
    expect(req.request.params.get('toDate')).toBe(toIsoDate(new Date()));
    req.flush([CASH]);
    await fixture.whenStable();

    const link = (fixture.nativeElement as HTMLElement).querySelector('l-table a.link');
    expect(link?.textContent?.trim()).toBe('Cash');
    expect(link?.getAttribute('href')).toBe(`/reports/accounting/ledger?account=3&toDate=${toIsoDate(new Date())}`);
  });

  it('sends no dates for a report that is always as of now', async () => {
    await setup('accounting/receivable');
    const req = nextRequest('accounting/receivable');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
    await fixture.whenStable();

    expect(component.emptyText()).toBe('No customer owes anything.');
    expect((fixture.nativeElement as HTMLElement).querySelector('l-date-input.date')).toBeNull();
  });

  it("shows the API's message when the report fails", async () => {
    await setup('inventory/stock');
    nextRequest('inventory/stock').flush(
      { success: false, message: 'Operation not allowed' },
      { status: 403, statusText: 'Forbidden' },
    );
    await fixture.whenStable();

    expect(component.emptyText()).toBe('Operation not allowed');
  });
});
