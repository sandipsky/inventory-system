import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DRAWER_DATA, DrawerRef, NotificationService } from '@lumen-ui/angular';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { Journal, JournalFormData, JournalPayload } from '../journal.model';
import { JournalForm } from './journal-form';

const API = environment.apiUrl;

const JOURNAL: Journal = {
  id: 5,
  date: '2026-10-31',
  system_entry_no: '|J-000005',
  remarks: 'Paid fuel bill in cash',
  journalEntries: [
    { id: 1, account_master_id: 9, account_master_name: 'Fuel Expenses', debit_amount: 500, credit_amount: 0, narration: 'Fuel' },
    { id: 2, account_master_id: 3, account_master_name: 'Cash', debit_amount: 0, credit_amount: 500, narration: 'Fuel' },
  ],
};

describe('JournalForm', () => {
  let http: HttpTestingController;

  async function setup(data?: JournalFormData) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [JournalForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data ?? null },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['EditJournalEntry'] }));
    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<JournalForm> = TestBed.createComponent(JournalForm);
    http.expectOne(`${API}/dropdown/accountMaster/all/all/active`).flush([
      { id: 3, name: 'Cash' },
      { id: 9, name: 'Fuel Expenses' },
    ]);
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  afterEach(() => http.verify());

  it('starts with a debit and a credit line and the next number', async () => {
    const { fixture, component } = await setup();
    http.expectOne(`${API}/journal/generateNumber`).flush('|J-000006');
    await fixture.whenStable();

    expect(component.heading().title).toBe('Add Journal Entry');
    expect(component.lines().length).toBe(2);
    expect(component.entryNo()).toBe('|J-000006');
  });

  it('posts a balanced journal, a blank narration taking the remarks', async () => {
    const { fixture, component, drawerRef } = await setup();
    http.expectOne(`${API}/journal/generateNumber`).flush('|J-000006');

    const [fuel, cash] = component.lines();
    fuel.setValue({ account_master_id: 9, narration: 'Diesel', debit_amount: 500, credit_amount: null });
    cash.setValue({ account_master_id: 3, narration: '', debit_amount: null, credit_amount: 500 });
    component.form.patchValue({ date: new Date(2026, 9, 31), remarks: ' Fuel bill ' });
    await fixture.whenStable();
    expect(component.totals()).toEqual({ debit: 500, credit: 500, difference: 0 });

    component.save();
    const req = http.expectOne({ method: 'POST', url: `${API}/journal` });
    expect(req.request.body as JournalPayload).toEqual({
      date: '2026-10-31',
      remarks: 'Fuel bill',
      journalEntries: [
        { account_master_id: 9, debit_amount: 500, credit_amount: 0, narration: 'Diesel' },
        { account_master_id: 3, debit_amount: 0, credit_amount: 500, narration: 'Fuel bill' },
      ],
    });
    req.flush({ success: true, message: 'Journal Added successfully', errorCode: 0, timestamp: 0, post_data_id: 6 });
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('refuses a journal whose debits and credits differ', async () => {
    const { component } = await setup();
    http.expectOne(`${API}/journal/generateNumber`).flush('|J-000006');
    const warn = vi.spyOn(TestBed.inject(NotificationService), 'warn');

    const [fuel, cash] = component.lines();
    fuel.setValue({ account_master_id: 9, narration: '', debit_amount: 500, credit_amount: null });
    cash.setValue({ account_master_id: 3, narration: '', debit_amount: null, credit_amount: 400 });
    component.save();

    expect(warn).toHaveBeenCalledWith('Not balanced', 'Total debit and total credit must be equal.');
  });

  it('views a saved journal and updates it from edit', async () => {
    const { fixture, component } = await setup({ mode: 'view', id: 5 });
    http.expectOne(`${API}/journal/5`).flush(JOURNAL);
    await fixture.whenStable();

    expect(component.readonly()).toBe(true);
    expect(component.entryNo()).toBe('|J-000005');
    expect(component.lines().map(line => line.getRawValue())).toEqual([
      { account_master_id: 9, narration: 'Fuel', debit_amount: 500, credit_amount: null },
      { account_master_id: 3, narration: 'Fuel', debit_amount: null, credit_amount: 500 },
    ]);

    component.startEdit();
    component.lines()[0].controls.debit_amount.setValue(600);
    component.lines()[1].controls.credit_amount.setValue(600);
    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/journal/5` });
    expect((req.request.body as JournalPayload).journalEntries.map(line => line.debit_amount + line.credit_amount)).toEqual([600, 600]);
    req.flush({});
  });
});
