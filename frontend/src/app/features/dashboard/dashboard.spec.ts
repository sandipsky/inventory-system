import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../auth/auth.service';
import { testUser } from '../../auth/auth.testing';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;

  async function render(operations: string[]): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    TestBed.inject(AuthService).user.set(testUser({ operations }));
    fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  function cards(element: HTMLElement): string[] {
    const selector = 'app-balance-cards, app-trend-card, app-totals-card, app-near-expiry-card, app-stock-info-card';
    return [...element.querySelectorAll(selector)].map(card => card.tagName.toLowerCase());
  }

  it('shows every card to a role that may read every report', async () => {
    const element = await render([
      'ViewAccount', 'ViewPurchaseEntry', 'ViewPurchaseReturn', 'ViewSalesEntries', 'ViewSalesReturns',
      'ViewStockEdit',
    ]);

    expect(cards(element)).toEqual([
      'app-balance-cards', 'app-trend-card', 'app-totals-card', 'app-totals-card', 'app-near-expiry-card', 'app-stock-info-card',
    ]);
  });

  it('leaves out the cards whose reports the role may not read', async () => {
    const element = await render(['ViewSalesEntries', 'ViewStockEdit']);

    expect(cards(element)).toEqual(['app-trend-card', 'app-totals-card', 'app-near-expiry-card', 'app-stock-info-card']);
  });

  it('says so when the role may read none of them', async () => {
    const element = await render(['ViewUnit']);

    expect(cards(element)).toEqual([]);
    expect(element.querySelector('.empty')?.textContent).toContain('Your role has no reports to show here.');
  });
});
