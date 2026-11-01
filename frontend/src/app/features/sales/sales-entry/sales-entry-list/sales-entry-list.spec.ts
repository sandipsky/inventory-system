import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ModalService } from '@lumen-ui/angular';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { CancelDialog, CancelDialogData } from '../../../../shared/components/cancel-dialog/cancel-dialog';
import { Sale } from '../../sales.model';
import { SalesEntryList } from './sales-entry-list';

const ROW: Sale = {
  id: 5,
  date: '2026-10-31',
  system_entry_no: '|SI-000005',
  transaction_type: 'Credit',
  customer_id: 6,
  customer_name: 'Ram Traders',
  discount_type: 'Flat',
  discount: 0,
  sub_total: 1000,
  non_taxable_amount: 0,
  taxable_amount: 1000,
  total_tax: 130,
  rounded: false,
  rounding: 0,
  grand_total: 1130,
  remarks: null,
  cancelled: false,
  cancel_remarks: null,
  salesEntries: [],
};

describe('SalesEntryList', () => {
  let component: SalesEntryList;
  let fixture: ComponentFixture<SalesEntryList>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/sales`;
  const empty = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesEntryList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(
      testUser({ operations: ['ViewSalesEntries', 'CreateSalesEntry', 'CancelSalesEntry'] }),
    );
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SalesEntryList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === url);
  }

  it('loads the first page newest first and shows each status', async () => {
    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('id:desc');
    req.flush({ ...empty, content: [ROW, { ...ROW, id: 6, system_entry_no: '|SI-000006', cancelled: true }], totalElements: 2 });
    await fixture.whenStable();

    const chips = [...(fixture.nativeElement as HTMLElement).querySelectorAll('l-table l-chip')].map(chip =>
      chip.textContent?.trim(),
    );
    expect(chips).toEqual(['CREDIT', 'ACTIVE', 'CREDIT', 'CANCELLED']);
  });

  it('filters cancelled sales by the stored flag', () => {
    nextRequest().flush(empty);
    component.onFilterChange([{ field: 'isCancelled', value: '1', displayValue: 'Cancelled' }]);
    const req = nextRequest();
    expect(req.request.params.get('isCancelled')).toBe('1');
    req.flush(empty);
  });

  it('cancels with a reason and reloads', () => {
    nextRequest().flush({ ...empty, content: [ROW], totalElements: 1 });
    const open = vi
      .spyOn(TestBed.inject(ModalService), 'open')
      .mockReturnValue({ afterClosed: () => of(true) } as never);

    component.cancel(ROW);
    expect(open).toHaveBeenCalledWith(CancelDialog, expect.anything());
    const data = open.mock.calls[0][1]?.data as CancelDialogData;
    expect(data.message).toContain('SI-000005 to Ram Traders');

    data.onConfirm('Wrong customer').subscribe();
    const cancel = http.expectOne({ method: 'POST', url: `${url}/5` });
    expect(cancel.request.body).toEqual({ cancel_remarks: 'Wrong customer' });
    cancel.flush({ success: true, message: 'Sales Cancelled successfully', errorCode: 0, timestamp: 0, post_data_id: 5 });

    nextRequest().flush(empty);
  });

  it('gates Add and Cancel on their permissions', async () => {
    nextRequest().flush(empty);
    expect(component.canCreate()).toBe(true);
    expect(component.canCancel()).toBe(true);

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewSalesEntries'] }));
    expect(component.canCreate()).toBe(false);
    expect(component.canCancel()).toBe(false);
  });
});
