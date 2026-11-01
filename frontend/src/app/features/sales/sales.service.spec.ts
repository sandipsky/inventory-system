import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SalesService } from './sales.service';

describe('SalesService', () => {
  let service: SalesService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/sales`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SalesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends list params as the query string', () => {
    service.list({ pageIndex: 0, pageSize: 10, isCancelled: '0' }).subscribe();
    const req = http.expectOne(r => r.url === url);
    expect(req.request.params.get('isCancelled')).toBe('0');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('reads the next number as text', () => {
    service.nextNumber().subscribe();
    expect(http.expectOne(`${url}/generateNumber`).request.responseType).toBe('text');
  });

  it('creates with POST', () => {
    service.create({ customer_id: 6 } as never).subscribe();
    expect(http.expectOne({ method: 'POST', url }).request.body).toEqual({ customer_id: 6 });
  });

  it('cancels with a POST to the sale, carrying the reason', () => {
    service.cancel(4, 'Wrong customer').subscribe();
    const req = http.expectOne({ method: 'POST', url: `${url}/4` });
    expect(req.request.body).toEqual({ cancel_remarks: 'Wrong customer' });
    req.flush({});
  });
});
