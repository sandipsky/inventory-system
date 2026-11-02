import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { BalanceCards } from './balance-cards';

describe('BalanceCards', () => {
  it('compares what is outstanding with a week ago', async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceCards],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(BalanceCards);

    http.expectOne(`${environment.apiUrl}/dashboard/balances`).flush({
      cash_balance: 900,
      payables: 84,
      receivables: 136,
      payables_week_ago: 100,
      receivables_week_ago: 100,
    });
    await fixture.whenStable();

    const [payables, receivables] = fixture.componentInstance.outstanding();
    // Owing vendors less is good news; customers owing more counts as good news too.
    expect(payables).toMatchObject({ amount: 84, change: -16, trend: 'good' });
    expect(receivables).toMatchObject({ amount: 136, change: 36, trend: 'good' });
    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Rs. 900.00');
    expect(text).toContain('-16%');
    expect(text).toContain('+36%');
  });

  it('leaves out the change when nothing was outstanding a week ago', async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceCards],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(BalanceCards);

    http.expectOne(`${environment.apiUrl}/dashboard/balances`).flush({
      cash_balance: 0, payables: 500, receivables: 0, payables_week_ago: 0, receivables_week_ago: 0,
    });
    await fixture.whenStable();

    expect(fixture.componentInstance.outstanding().map(item => item.change)).toEqual([null, null]);
    expect((fixture.nativeElement as HTMLElement).querySelector('.change')).toBeNull();
  });
});
