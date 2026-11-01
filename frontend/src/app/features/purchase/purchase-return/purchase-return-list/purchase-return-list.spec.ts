import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DrawerService } from '@lumen-ui/angular';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { PurchaseReturn } from '../../purchase.model';
import { PurchaseReturnForm } from '../purchase-return-form/purchase-return-form';
import { PurchaseReturnList } from './purchase-return-list';

const ROW: PurchaseReturn = {
  id: 2,
  date: '2026-10-31',
  bill_no: 'INV-5501',
  system_entry_no: '|PR-000002',
  transaction_type: 'Cash',
  vendor_id: 6,
  vendor_name: 'ABC Suppliers',
  ref_purchase_id: 3,
  ref_purchase_no: '|PE-000003',
  discount_type: 'Percentage',
  discount: 10,
  sub_total: 200,
  non_taxable_amount: 0,
  taxable_amount: 180,
  tax: 23.4,
  rounded: false,
  rounding: 0,
  grand_total: 203.4,
  remarks: null,
  purchaseReturnEntries: [],
};

describe('PurchaseReturnList', () => {
  let component: PurchaseReturnList;
  let fixture: ComponentFixture<PurchaseReturnList>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/purchase-return`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseReturnList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewPurchaseReturn', 'CreatePurchaseReturn'] }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PurchaseReturnList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === url);
  }

  it('loads the first page newest first and shows the reference purchase', async () => {
    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('id:desc');
    req.flush({ content: [ROW], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('l-table .link')?.textContent?.trim()).toBe('PR-000002');
    expect(el.querySelector('l-table')?.textContent).toContain('PE-000003');
    expect(component.discountOf(ROW)).toBe(20);
  });

  it('sorts the reference column by the linked purchase number', () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    component.sort.set({ key: 'ref_purchase_no', direction: 'asc' });
    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('refPurchase.systemEntryNo:asc');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('opens the form in a bottom drawer and reloads after a save', () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    const open = vi
      .spyOn(TestBed.inject(DrawerService), 'open')
      .mockReturnValue({ afterClosed: () => of(true) } as never);

    component.openForm('edit', 2);
    expect(open).toHaveBeenCalledWith(
      PurchaseReturnForm,
      expect.objectContaining({ data: { mode: 'edit', id: 2, calendar: 'bs' }, position: 'bottom', disableClose: true }),
    );
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('shows Add only with the create permission', async () => {
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    const addButton = () =>
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('l-button')].some(b =>
        b.textContent?.includes('Add Purchase Return'),
      );
    expect(addButton()).toBe(true);

    TestBed.inject(AuthService).user.set(testUser({ operations: ['ViewPurchaseReturn'] }));
    await fixture.whenStable();
    expect(addButton()).toBe(false);
  });
});
