import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';
import { testUser } from '../../../auth/auth.testing';
import { TrendCard } from './trend-card';

describe('TrendCard', () => {
  let fixture: ComponentFixture<TrendCard>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/dashboard/purchase-vs-sales`;

  async function create(operations: string[]) {
    await TestBed.configureTestingModule({
      imports: [TrendCard],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    TestBed.inject(AuthService).user.set(testUser({ operations }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TrendCard);
    TestBed.tick();
  }

  it('draws purchases and sales per month', async () => {
    await create(['ViewPurchaseEntry', 'ViewSalesEntries']);

    const req = http.expectOne(req => req.url === url);
    expect(req.request.params.get('interval')).toBe('monthly');
    req.flush({
      interval: 'monthly',
      points: [
        { from_date: '2026-10-01', to_date: '2026-10-31', purchase: 0, sales: 200 },
        { from_date: '2026-11-01', to_date: '2026-11-30', purchase: 300, sales: 0 },
      ],
    });
    await fixture.whenStable();

    const chart = fixture.componentInstance.chart();
    expect(chart.labels).toEqual(['Oct', 'Nov']);
    expect(chart.titles).toEqual(['October 2026', 'November 2026']);
    expect(chart.series.map(series => [series.name, series.values])).toEqual([
      ['Purchase', [0, 300]],
      ['Sales', [200, 0]],
    ]);
  });

  it('draws only the lines the role may view', async () => {
    await create(['ViewSalesEntries']);

    http.expectOne(req => req.url === url).flush({
      interval: 'monthly',
      points: [{ from_date: '2026-11-01', to_date: '2026-11-30', purchase: null, sales: 50 }],
    });
    await fixture.whenStable();

    expect(fixture.componentInstance.chart().series.map(series => series.name)).toEqual(['Sales']);
  });

  it('asks for days when switched to Daily', async () => {
    await create(['ViewSalesEntries']);
    http.expectOne(req => req.url === url).flush({ interval: 'monthly', points: [] });

    fixture.componentInstance.interval.set('daily');
    TestBed.tick();

    expect(http.expectOne(req => req.url === url).request.params.get('interval')).toBe('daily');
  });
});
