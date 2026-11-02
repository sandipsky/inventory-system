import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';
import { testUser } from '../../../auth/auth.testing';
import { lastMonths } from '../figures';
import { TotalsCard, TotalsKind } from './totals-card';

describe('TotalsCard', () => {
  let fixture: ComponentFixture<TotalsCard>;
  let http: HttpTestingController;
  const url = (summary: string) => `${environment.apiUrl}/dashboard/${summary}`;

  async function create(kind: TotalsKind, operations: string[]) {
    await TestBed.configureTestingModule({
      imports: [TotalsCard],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    TestBed.inject(AuthService).user.set(testUser({ operations }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TotalsCard);
    fixture.componentRef.setInput('kind', kind);
    TestBed.tick();
  }

  function figures() {
    return fixture.componentInstance.figures().map(figure => [figure.label, figure.value]);
  }

  it('shows sales, returns and the net over the last six months', async () => {
    await create('sales', ['ViewSalesEntries', 'ViewSalesReturns']);

    const req = http.expectOne(req => req.url === url('sales-summary'));
    expect(req.request.params.get('fromDate')).toBe(lastMonths(6).fromDate);
    expect(req.request.params.get('toDate')).toBe(lastMonths(6).toDate);
    req.flush({ total_sales: 500, total_sales_return: 120, net_sales: 380 });
    await fixture.whenStable();

    expect(figures()).toEqual([
      ['Total Sales', 500],
      ['Total Sales Return', 120],
      ['Net Sales', 380],
    ]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Rs. 380.00');
  });

  it('shows only the figures the role may view', async () => {
    await create('sales', ['ViewSalesEntries']);

    http.expectOne(req => req.url === url('sales-summary')).flush({ total_sales: 500, total_sales_return: null, net_sales: null });
    await fixture.whenStable();

    expect(figures()).toEqual([['Total Sales', 500]]);
  });

  it('reads purchases from their own summary and reloads for another period', async () => {
    await create('purchase', ['ViewPurchaseEntry', 'ViewPurchaseReturn']);
    http.expectOne(req => req.url === url('purchase-summary')).flush({ total_purchase: 900, total_purchase_return: 40 });
    await fixture.whenStable();
    expect(figures()).toEqual([
      ['Total Purchase', 900],
      ['Total Purchase Return', 40],
    ]);

    fixture.componentInstance.months.set(1);
    TestBed.tick();

    const req = http.expectOne(req => req.url === url('purchase-summary'));
    expect(req.request.params.get('fromDate')).toBe(lastMonths(1).fromDate);
  });
});
