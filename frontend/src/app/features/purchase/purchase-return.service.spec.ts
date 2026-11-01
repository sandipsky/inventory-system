import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PurchaseReturnService } from './purchase-return.service';

describe('PurchaseReturnService', () => {
  let service: PurchaseReturnService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/purchase-return`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PurchaseReturnService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends list params as the query string', () => {
    service.list({ pageIndex: 0, pageSize: 10, 'vendor.name': 'abc' }).subscribe();
    const req = http.expectOne(r => r.url === url);
    expect(req.request.params.get('vendor.name')).toBe('abc');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('reads the next number as text', () => {
    service.nextNumber().subscribe();
    expect(http.expectOne(`${url}/generateNumber`).request.responseType).toBe('text');
  });

  it('creates, updates and deletes', () => {
    const payload = { bill_no: 'B1' } as never;
    service.create(payload).subscribe();
    service.update(4, payload).subscribe();
    service.delete(4).subscribe();
    http.expectOne({ method: 'POST', url }).flush({});
    http.expectOne({ method: 'PUT', url: `${url}/4` }).flush({});
    http.expectOne({ method: 'DELETE', url: `${url}/4` }).flush({});
  });
});
