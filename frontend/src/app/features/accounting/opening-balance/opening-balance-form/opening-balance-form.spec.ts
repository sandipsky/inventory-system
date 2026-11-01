import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationService } from '@lumen-ui/angular';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { startOfToday } from '../../../../shared/utils/date';
import { Journal, JournalPayload } from '../../journal/journal.model';
import { OpeningBalanceForm } from './opening-balance-form';

const API = environment.apiUrl;
const url = `${API}/opening-balance`;

const NOT_SET: Journal = { id: 0, date: null, system_entry_no: 'OPENING-BALANCE', remarks: null, journalEntries: null };

const OPENING: Journal = {
  id: 6,
  date: '2026-07-17',
  system_entry_no: 'OPENING-BALANCE',
  remarks: 'Opening balance FY 2083/84',
  journalEntries: [
    { id: 1, account_master_id: 3, account_master_name: 'Cash', debit_amount: 50000, credit_amount: 0, narration: 'Opening Balance' },
    { id: 2, account_master_id: 12, account_master_name: 'Capital', debit_amount: 0, credit_amount: 50000, narration: 'Opening Balance' },
  ],
};

describe('OpeningBalanceForm', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<OpeningBalanceForm>;
  let component: OpeningBalanceForm;

  async function setup(openingBalance: Journal, operations = ['ViewOpeningBalance', 'CreateOpeningBalance']) {
    await TestBed.configureTestingModule({
      imports: [OpeningBalanceForm],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OpeningBalanceForm);
    component = fixture.componentInstance;
    http.expectOne(`${API}/dropdown/accountMaster/all/all/active`).flush([{ id: 3, name: 'Cash' }]);
    http.expectOne(url).flush(openingBalance);
    await fixture.whenStable();
  }

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  afterEach(() => http.verify());

  it('says when none is set, and starts one from today with two lines', async () => {
    await setup(NOT_SET);
    expect(component.isSet()).toBe(false);
    expect(text()).toContain('No opening balance has been set yet.');
    expect(text()).toContain('Set Opening Balance');

    component.startEdit();
    await fixture.whenStable();
    expect(component.form.controls.date.value).toEqual(startOfToday());
    expect(component.lines().length).toBe(2);

    const [cash, capital] = component.lines();
    cash.setValue({ account_master_id: 3, narration: '', debit_amount: 1000, credit_amount: null });
    capital.setValue({ account_master_id: 12, narration: '', debit_amount: null, credit_amount: 1000 });
    component.form.controls.date.setValue(new Date(2026, 6, 17));
    component.save();

    const req = http.expectOne({ method: 'POST', url });
    expect(req.request.body as JournalPayload).toEqual({
      date: '2026-07-17',
      remarks: null,
      journalEntries: [
        { account_master_id: 3, debit_amount: 1000, credit_amount: 0, narration: 'Opening Balance' },
        { account_master_id: 12, debit_amount: 0, credit_amount: 1000, narration: 'Opening Balance' },
      ],
    });
    req.flush({ success: true, message: 'Opening Balance Saved successfully', errorCode: 0, timestamp: 0, post_data_id: 6 });

    // Shows it as stored.
    http.expectOne(url).flush(OPENING);
    await fixture.whenStable();
    expect(component.editing()).toBe(false);
    expect(component.isSet()).toBe(true);
  });

  it('shows the saved balances and puts them back on cancel', async () => {
    await setup(OPENING);
    expect(component.readonly()).toBe(true);
    expect(component.totals()).toEqual({ debit: 50000, credit: 50000, difference: 0 });
    expect(component.accountOptions()).toEqual([
      { id: 3, name: 'Cash' },
      { id: 12, name: 'Capital' },
    ]);

    component.startEdit();
    component.lines()[0].controls.debit_amount.setValue(60000);
    component.cancel();
    expect(component.editing()).toBe(false);
    expect(component.lines()[0].controls.debit_amount.value).toBe(50000);
  });

  it('refuses balances that do not balance', async () => {
    await setup(OPENING);
    const warn = vi.spyOn(TestBed.inject(NotificationService), 'warn');
    component.startEdit();
    component.lines()[0].controls.debit_amount.setValue(60000);
    component.save();
    expect(warn).toHaveBeenCalledWith('Not balanced', 'Total debit and total credit must be equal.');
  });

  it('offers no Edit without the create permission', async () => {
    await setup(OPENING, ['ViewOpeningBalance']);
    expect(component.canEdit()).toBe(false);
    expect(text()).not.toContain('Edit');
  });
});
