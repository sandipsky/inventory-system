import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DRAWER_DATA, DrawerRef } from '@lumen-ui/angular';
import { environment } from '../../../../../environments/environment';
import { Account, AccountFormData } from '../account.model';
import { AccountForm } from './account-form';

const API = environment.apiUrl;
const SAVED = { success: true, message: 'Saved', errorCode: 0, timestamp: 0, post_data_id: 37 };
const TYPES = [
  { heading: 'Assets', types: ['Cash & Cash Equivalents', 'Receivables'] },
  { heading: 'Liability', types: ['Payables'] },
];
const CASH_PARENTS = `${API}/accountMaster/getParentAccount/Cash%20%26%20Cash%20Equivalents`;

const CASH: Account = {
  id: 3,
  account_code: 'C-001',
  account_name: 'Cash',
  account_type: 'Cash & Cash Equivalents',
  parent_id: 1,
  parent_account_name: 'Cash In Hand',
  is_active: true,
  is_system_generated: true,
  deletable: false,
  remarks: null,
};

describe('AccountForm', () => {
  let http: HttpTestingController;

  async function setup(data: AccountFormData) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [AccountForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<AccountForm> = TestBed.createComponent(AccountForm);
    http.expectOne(`${API}/accountMaster/getAccountTypes`).flush(TYPES);
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  afterEach(() => http.verify());

  it('adds an account under the parent picked for its type', async () => {
    const { component, drawerRef } = await setup({});
    expect(component.title).toBe('Add Account');
    expect(component.typeOptions()).toContainEqual({ name: 'Payables', heading: 'Liability' });

    component.form.patchValue({ account_name: ' Nabil Bank ', account_code: 'B-001' });
    component.form.controls.account_type.setValue('Cash & Cash Equivalents');
    http.expectOne(CASH_PARENTS).flush([
      { id: 1, name: 'Cash In Hand' },
      { id: 3, name: 'Cash' },
    ]);
    component.form.controls.parent_id.setValue(1);
    component.save();

    const req = http.expectOne({ method: 'POST', url: `${API}/accountMaster` });
    expect(req.request.body).toEqual({
      account_code: 'B-001',
      account_name: 'Nabil Bank',
      account_type: 'Cash & Cash Equivalents',
      parent_id: 1,
      parent_account_name: 'Cash In Hand',
      is_active: true,
      deletable: true,
      remarks: null,
    });
    req.flush(SAVED);
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('requires a code, and sends parent 0 when there is none', async () => {
    const { component } = await setup({});
    component.form.patchValue({ account_name: 'Interest Income' });
    component.form.controls.account_type.setValue('Payables');
    http.expectOne(`${API}/accountMaster/getParentAccount/Payables`).flush([{ id: 18, name: 'Trader Payable' }]);

    component.save();
    http.expectNone({ method: 'POST', url: `${API}/accountMaster` });
    expect(component.form.controls.account_code.touched).toBe(true);

    component.form.controls.account_code.setValue('I-001');
    component.save();
    const req = http.expectOne({ method: 'POST', url: `${API}/accountMaster` });
    expect(req.request.body).toMatchObject({ parent_id: 0, parent_account_name: null });
    req.flush(SAVED);
  });

  it('clears the parent when the user picks another type', async () => {
    const { component } = await setup({});
    component.form.controls.account_type.setValue('Payables');
    http.expectOne(`${API}/accountMaster/getParentAccount/Payables`).flush([{ id: 18, name: 'Trader Payable' }]);
    component.form.controls.parent_id.setValue(18);

    component.form.controls.account_type.setValue('Receivables');
    component.onTypeChange();
    http.expectOne(`${API}/accountMaster/getParentAccount/Receivables`).flush([]);
    expect(component.form.controls.parent_id.value).toBeNull();
  });

  it('locks a system account’s name, type and parent and keeps it undeletable', async () => {
    const { fixture, component } = await setup({ record: CASH, owner: 'system' });
    // The parent list may hold the account itself, which is left out; the saved parent stays an option.
    http.expectOne(CASH_PARENTS).flush([{ id: 3, name: 'Cash' }]);
    expect(component.parentOptions()).toEqual([{ id: 1, name: 'Cash In Hand' }]);

    expect(component.form.controls.account_name.disabled).toBe(true);
    expect(component.form.controls.account_type.disabled).toBe(true);
    expect(component.form.controls.parent_id.disabled).toBe(true);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('System account');

    component.form.controls.account_code.setValue('C-010');
    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/accountMaster/3` });
    expect(req.request.body).toEqual({
      account_code: 'C-010',
      account_name: 'Cash',
      account_type: 'Cash & Cash Equivalents',
      parent_id: 1,
      parent_account_name: 'Cash In Hand',
      is_active: true,
      deletable: false,
      remarks: null,
    });
    req.flush(SAVED);
  });

  it('stays open when the server refuses', async () => {
    const { component, drawerRef } = await setup({});
    component.form.patchValue({ account_name: 'Nabil Bank', account_code: 'C-001' });
    component.form.controls.account_type.setValue('Receivables');
    http.expectOne(`${API}/accountMaster/getParentAccount/Receivables`).flush([]);
    component.save();
    http
      .expectOne({ method: 'POST', url: `${API}/accountMaster` })
      .flush({ message: 'Duplicate Account Code' }, { status: 409, statusText: 'Conflict' });
    expect(drawerRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBe(false);
  });
});
