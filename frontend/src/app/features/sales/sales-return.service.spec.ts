import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SalesReturnService } from './sales-return.service';

describe('SalesReturnService', () => {
  let service: SalesReturnService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/sales-return`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SalesReturnService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the next number as text', () => {
    service.nextNumber().subscribe();
    expect(http.expectOne(`${url}/generateNumber`).request.responseType).toBe('text');
  });

  it('creates with POST and cancels with a POST to the return', () => {
    service.create({ customer_id: 6 } as never).subscribe();
    service.cancel(2, 'Entered twice').subscribe();
    http.expectOne({ method: 'POST', url }).flush({});
    const cancel = http.expectOne({ method: 'POST', url: `${url}/2` });
    expect(cancel.request.body).toEqual({ cancel_remarks: 'Entered twice' });
    cancel.flush({});
  });
});
