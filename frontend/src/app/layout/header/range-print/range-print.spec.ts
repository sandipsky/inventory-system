import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DrawerRef } from '@lumen-ui/angular';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';
import { testUser } from '../../../auth/auth.testing';
import { RangePrint } from './range-print';

describe('RangePrint', () => {
  const close = vi.fn();
  const { createObjectURL, revokeObjectURL } = URL;

  function create(operations: string[]): RangePrint {
    TestBed.configureTestingModule({
      imports: [RangePrint],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: DrawerRef, useValue: { close } }],
    });
    TestBed.inject(AuthService).user.set(testUser({ operations }));
    const component = TestBed.createComponent(RangePrint).componentInstance;
    component.fromDate.set(new Date(2026, 10, 1));
    component.toDate.set(new Date(2026, 10, 2));
    return component;
  }

  beforeEach(() => {
    close.mockClear();
    URL.createObjectURL = vi.fn(() => 'blob:file');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    vi.restoreAllMocks();
    TestBed.inject(HttpTestingController).verify();
  });

  it('offers only the documents the role may view', () => {
    const component = create(['ViewSalesEntries', 'ViewCustomerPayment']);
    expect(component.options.map(option => option.label)).toEqual(['Sales', 'Payment']);
    expect(component.document()).toBe('sales');
  });

  it('prints the period of the picked kind as one PDF, then closes', () => {
    const component = create(['ViewPurchaseEntry', 'ViewSalesReturns']);
    component.document.set('sales-return');
    component.print();

    const req = TestBed.inject(HttpTestingController).expectOne(
      r => r.url === `${environment.apiUrl}/sales-return/print`,
    );
    expect(req.request.params.get('fromDate')).toBe('2026-11-01');
    expect(req.request.params.get('toDate')).toBe('2026-11-02');
    expect(req.request.params.get('calendar')).toBe('bs');
    req.flush(new Blob(['pdf']));
    expect(close).toHaveBeenCalled();
  });

  it('keeps payments to the one party type the role may view', () => {
    const component = create(['ViewVendorPayment']);
    component.print();

    const req = TestBed.inject(HttpTestingController).expectOne(
      r => r.url === `${environment.apiUrl}/payment/print`,
    );
    expect(req.request.params.get('type')).toBe('Vendor');
    req.flush(new Blob(['pdf']));
  });
});
