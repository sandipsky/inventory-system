import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PurchaseService } from './purchase.service';

describe('PurchaseService', () => {
  let service: PurchaseService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/purchase`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PurchaseService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends list params as the query string', () => {
    service.list({ pageIndex: 1, pageSize: 10, sort: 'date:desc', 'vendor.name': 'abc' }).subscribe();
    const req = http.expectOne(r => r.url === url);
    expect(req.request.params.get('pageIndex')).toBe('1');
    expect(req.request.params.get('vendor.name')).toBe('abc');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 1, size: 10 });
  });

  it('reads the next number as text', () => {
    let number = '';
    service.nextNumber().subscribe(value => (number = value));
    const req = http.expectOne(`${url}/generateNumber`);
    expect(req.request.responseType).toBe('text');
    req.flush('|PE-000002');
    expect(number).toBe('|PE-000002');
  });

  it('creates with POST and updates with PUT', () => {
    const payload = { bill_no: 'B1' } as never;
    service.create(payload).subscribe();
    service.update(4, payload).subscribe();
    const post = http.expectOne({ method: 'POST', url });
    expect(post.request.body).toEqual({ bill_no: 'B1' });
    post.flush({});
    http.expectOne({ method: 'PUT', url: `${url}/4` }).flush({});
  });
});
