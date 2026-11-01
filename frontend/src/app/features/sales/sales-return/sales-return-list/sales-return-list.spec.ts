import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DrawerService, ModalService } from '@lumen-ui/angular';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { CancelDialogData } from '../../../../shared/components/cancel-dialog/cancel-dialog';
import { SalesReturn } from '../../sales.model';
import { SalesReturnForm } from '../sales-return-form/sales-return-form';
import { SalesReturnList } from './sales-return-list';

const ROW: SalesReturn = {
  id: 2,
  date: '2026-11-01',
  system_entry_no: '|SR-000002',
  transaction_type: 'Cash',
  customer_id: 6,
  customer_name: 'Ram Traders',
  ref_sales_id: 7,
  ref_sales_no: '|SI-000007',
  discount_type: 'Flat',
  discount: 0,
  sub_total: 100,
  non_taxable_amount: 0,
  taxable_amount: 100,
  total_tax: 13,
  rounded: false,
  rounding: 0,
  grand_total: 113,
  remarks: null,
  cancelled: false,
  cancel_remarks: null,
  salesReturnEntries: [],
};

describe('SalesReturnList', () => {
  let component: SalesReturnList;
  let fixture: ComponentFixture<SalesReturnList>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/sales-return`;
  const empty = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesReturnList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(
      testUser({ operations: ['ViewSalesReturns', 'CreateSalesReturn', 'CancelSalesReturn'] }),
    );
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SalesReturnList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === url);
  }

  it('loads the first page and shows the reference invoice', async () => {
    nextRequest().flush({ ...empty, content: [ROW], totalElements: 1 });
    await fixture.whenStable();

    const table = (fixture.nativeElement as HTMLElement).querySelector('l-table');
    expect(table?.querySelector('.link')?.textContent?.trim()).toBe('SR-000002');
    expect(table?.textContent).toContain('SI-000007');
  });

  it('opens add and view in the drawer, never edit', () => {
    nextRequest().flush(empty);
    const open = vi
      .spyOn(TestBed.inject(DrawerService), 'open')
      .mockReturnValue({ afterClosed: () => of(false) } as never);

    component.openForm('view', 2);
    expect(open).toHaveBeenCalledWith(
      SalesReturnForm,
      expect.objectContaining({ data: { mode: 'view', id: 2, calendar: 'bs' }, position: 'bottom' }),
    );
  });

  it('cancels a return with a reason and reloads', () => {
    nextRequest().flush({ ...empty, content: [ROW], totalElements: 1 });
    const open = vi
      .spyOn(TestBed.inject(ModalService), 'open')
      .mockReturnValue({ afterClosed: () => of(true) } as never);

    component.cancel(ROW);
    const data = open.mock.calls[0][1]?.data as CancelDialogData;
    expect(data.confirmText).toBe('Cancel Return');
    data.onConfirm('Entered twice').subscribe();
    const cancel = http.expectOne({ method: 'POST', url: `${url}/2` });
    expect(cancel.request.body).toEqual({ cancel_remarks: 'Entered twice' });
    cancel.flush({});

    nextRequest().flush(empty);
  });
});
