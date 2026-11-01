import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { OutstandingInvoice } from './payment.model';
import { PaymentService } from './payment.service';

const API = environment.apiUrl;

function due(party_id: number, invoice_number: string): OutstandingInvoice {
  return {
    party_type: 'Vendor',
    party_id,
    party_name: `Vendor ${party_id}`,
    invoice_number,
    invoice_date: '2026-10-01',
    total_invoice_amount: 100,
    paid_amount: 0,
    due_amount: 100,
  };
}

describe('PaymentService', () => {
  let service: PaymentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PaymentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads a vendor’s invoices due from payables and a customer’s from receivables', () => {
    let invoices: OutstandingInvoice[] = [];
    service.outstanding('Vendor', 1).subscribe(rows => (invoices = rows));
    http.expectOne(`${API}/reports/accounting/payable`).flush([due(1, '|PE-1'), due(2, '|PE-2'), due(1, '|PE-3')]);
    expect(invoices.map(row => row.invoice_number)).toEqual(['|PE-1', '|PE-3']);

    service.outstanding('Customer', 6).subscribe();
    http.expectOne(`${API}/reports/accounting/receivable`).flush([]);
  });

  it('lists unadjusted payments and adjusts one with a list of invoices', () => {
    service.unadjusted({ pageIndex: 0, partyName: 'abc' }).subscribe();
    const list = http.expectOne(req => req.url === `${API}/payment-adjustment`);
    expect(list.request.params.get('partyName')).toBe('abc');
    list.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });

    const details = [{ invoice_number: '|PE-1', invoice_date: null, total_invoice_amount: 100, due_amount: 0, paid_amount: 100 }];
    service.adjust(4, details).subscribe();
    const post = http.expectOne({ method: 'POST', url: `${API}/payment-adjustment/4` });
    expect(post.request.body).toEqual(details);
    post.flush({});
  });
});
