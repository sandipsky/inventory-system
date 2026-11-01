import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { Account } from '../account.model';
import { AccountList } from './account-list';

const API = environment.apiUrl;

function account(overrides: Partial<Account>): Account {
  return {
    id: 1,
    account_code: null,
    account_name: 'Account',
    account_type: 'Payables',
    parent_id: 0,
    parent_account_name: null,
    is_active: true,
    is_system_generated: false,
    deletable: true,
    remarks: null,
    ...overrides,
  };
}

const CASH = account({
  id: 3,
  account_code: 'C-001',
  account_name: 'Cash',
  account_type: 'Cash & Cash Equivalents',
  parent_id: 1,
  parent_account_name: 'Cash In Hand',
  is_system_generated: true,
  deletable: false,
});
const VENDOR = account({ id: 25, account_name: 'Tech Distributors Inc.', parent_id: 18, parent_account_name: 'Trader Payable' });
const CUSTOMER = account({ id: 30, account_name: 'Gadget Retailers', account_type: 'Receivables' });
const BANK = account({ id: 37, account_code: 'B-001', account_name: 'Nabil Bank', account_type: 'Cash & Cash Equivalents' });

describe('AccountList', () => {
  let component: AccountList;
  let fixture: ComponentFixture<AccountList>;
  let http: HttpTestingController;

  async function setup(operations: string[]) {
    await TestBed.configureTestingModule({
      imports: [AccountList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AccountList);
    component = fixture.componentInstance;
    http.expectOne(`${API}/accountMaster/getAccountTypes`).flush([
      { heading: 'Assets', types: ['Cash & Cash Equivalents', 'Receivables'] },
      { heading: 'Liability', types: ['Payables'] },
    ]);
    http.expectOne(`${API}/dropdown/accountMaster/party/vendor/all`).flush([{ id: 25, name: VENDOR.account_name }]);
    http.expectOne(`${API}/dropdown/accountMaster/party/customer/all`).flush([{ id: 30, name: CUSTOMER.account_name }]);
    await fixture.whenStable();
  }

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === `${API}/accountMaster`);
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('loads the first page, newest first, with each type’s heading', async () => {
    await setup(['ViewAccountMaster', 'CreateAccountMaster', 'EditAccountMaster']);
    const req = nextRequest();
    expect(req.request.params.get('pageIndex')).toBe('0');
    expect(req.request.params.get('sort')).toBe('id:desc');
    req.flush({ content: [BANK], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(text()).toContain('Add Account');
    expect(text()).toContain('Nabil Bank');
    expect(text()).toContain('B-001');
    expect(component.headingOf(BANK)).toBe('Assets');
    expect(component.filterColumns().find(column => column.formcontrolName === 'accountType')?.data).toEqual([
      { id: 'Cash & Cash Equivalents', name: 'Cash & Cash Equivalents', heading: 'Assets' },
      { id: 'Receivables', name: 'Receivables', heading: 'Assets' },
      { id: 'Payables', name: 'Payables', heading: 'Liability' },
    ]);
  });

  it('tags system, vendor and customer accounts and lets only the user’s own be deleted', async () => {
    await setup(['ViewAccountMaster', 'EditAccountMaster', 'DeleteAccountMaster']);
    nextRequest().flush({ content: [CASH, VENDOR, CUSTOMER, BANK], totalElements: 4, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect([CASH, VENDOR, CUSTOMER, BANK].map(row => component.ownerOf(row))).toEqual([
      'system', 'vendor', 'customer', undefined,
    ]);
    expect([CASH, VENDOR, CUSTOMER, BANK].map(row => component.canDeleteRow(row))).toEqual([false, false, false, true]);
    expect(text()).toContain('System');
    expect(text()).toContain('Vendor');
    expect(text()).toContain('Customer');
  });

  it('sorts by the backend field and filters from page one', async () => {
    await setup(['ViewAccountMaster']);
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });

    component.pageIndex.set(1);
    component.sort.set({ key: 'parent_account_name', direction: 'asc' });
    component.onFilterChange([{ field: 'accountType', value: 'Payables', displayValue: 'Payables' }]);

    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('parentAccountName:asc');
    expect(req.request.params.get('accountType')).toBe('Payables');
    expect(req.request.params.get('pageIndex')).toBe('0');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('shows Add and row actions only with the matching permissions', async () => {
    await setup(['ViewAccountMaster']);
    nextRequest().flush({ content: [BANK], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(text()).not.toContain('Add Account');
    expect(component.columns().some(column => column.key === 'actions')).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('l-table .link')).toBeNull();
  });
});
