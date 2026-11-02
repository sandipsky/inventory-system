import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { testUser } from '../../../auth/auth.testing';
import { Reports } from './reports';

describe('Reports', () => {
  let fixture: ComponentFixture<Reports>;

  async function render(operations: string[]): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [provideRouter([])],
    }).compileComponents();
    TestBed.inject(AuthService).user.set(testUser({ operations }));
    fixture = TestBed.createComponent(Reports);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  const groups = (element: HTMLElement) => [...element.querySelectorAll('.group .title')].map(el => el.textContent?.trim());
  const links = (element: HTMLElement) => [...element.querySelectorAll('a.link')].map(el => el.getAttribute('href'));

  it('groups every report for a role that may read them all', async () => {
    const element = await render([
      'ViewPurchaseEntry', 'ViewPurchaseReturn', 'ViewSalesEntries', 'ViewSalesReturns', 'ViewStockEdit', 'ViewAccount',
    ]);

    expect(groups(element)).toEqual(['Purchase', 'Purchase Return', 'Sales', 'Sales Return', 'Inventory', 'Accounting']);
    expect(links(element)).toHaveLength(22);
    expect(links(element)).toContain('/reports/sales/customer');
    expect(links(element)).toContain('/reports/accounting/ledger');
  });

  it('lists only the reports the role may read, dropping empty groups', async () => {
    const element = await render(['ViewSalesEntries', 'ViewVendorPayment']);

    expect(groups(element)).toEqual(['Sales', 'Accounting']);
    expect(links(element)).toEqual([
      '/reports/sales', '/reports/sales/customer', '/reports/sales/product', '/reports/sales/batch',
      '/reports/accounting/payable',
    ]);
  });

  it('says so when the role may read none', async () => {
    const element = await render(['ViewUnit']);

    expect(groups(element)).toEqual([]);
    expect(element.querySelector('.empty')?.textContent).toContain('Your role has no reports to open.');
  });
});
