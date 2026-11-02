import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../../shared/models/api.model';
import { FileService } from '../../../shared/services/file.service';
import { FileFormat } from '../../../shared/utils/file';
import { OutstandingInvoice, PartyType, Payment, PaymentDetail, PaymentPayload } from './payment.model';

/**
 * Vendor and customer payments (`/payment`), the invoices they can settle, and payment
 * adjustment (`/payment-adjustment`), which settles a payment's leftover later.
 */
@Service()
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly files = inject(FileService);
  private readonly baseUrl = `${environment.apiUrl}/payment`;

  /** Filter `type` (`Vendor` / `Customer`) and `partyName` (vendor or customer name) among others. */
  list(params: ListParams): Observable<Page<Payment>> {
    return this.http.get<Page<Payment>>(this.baseUrl, { params });
  }

  get(id: number): Observable<Payment> {
    return this.http.get<Payment>(`${this.baseUrl}/${id}`);
  }

  /** Preview of the next payment number (plain text, e.g. `|P-000001`). */
  nextNumber(): Observable<string> {
    return this.http.get(`${this.baseUrl}/generateNumber`, { responseType: 'text' });
  }

  create(payment: PaymentPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, payment);
  }

  update(id: number, payment: PaymentPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, payment);
  }

  /** The invoices it settled become due again. */
  delete(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }

  /** A party's invoices with money still due, oldest first: credit purchases of a vendor, credit sales of a customer. */
  outstanding(type: PartyType, partyId: number): Observable<OutstandingInvoice[]> {
    const report = type === 'Vendor' ? 'payable' : 'receivable';
    return this.http
      .get<OutstandingInvoice[]>(`${environment.apiUrl}/reports/accounting/${report}`)
      .pipe(map(rows => rows.filter(row => row.party_id === partyId)));
  }

  /** Payments with an unadjusted amount left; filtered and paged like `list`. */
  unadjusted(params: ListParams): Observable<Page<Payment>> {
    return this.http.get<Page<Payment>>(`${environment.apiUrl}/payment-adjustment`, { params });
  }

  /** Settles invoices with part of the payment's unadjusted amount. */
  adjust(paymentId: number, details: PaymentDetail[]): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${environment.apiUrl}/payment-adjustment/${paymentId}`, details);
  }

  /** The payments `params` match (filters, dates, sort; not paged) as an Excel or PDF file. */
  exportList(format: FileFormat, params: ListParams): Observable<void> {
    return this.files.download(`${this.baseUrl}/export/${format}`, params);
  }

  /** One payment as a PDF voucher or receipt, or its settled invoices as an Excel file. */
  exportOne(id: number, format: FileFormat, params: ListParams = {}): Observable<void> {
    return this.files.download(`${this.baseUrl}/${id}/export/${format}`, params);
  }

  /** Every payment between `fromDate` and `toDate` in one PDF; `type` keeps to vendors or customers. */
  printRange(params: ListParams): Observable<void> {
    return this.files.download(`${this.baseUrl}/print`, params);
  }

  /** The payments still to adjust that `params` match (not paged) as an Excel or PDF file. */
  exportUnadjusted(format: FileFormat, params: ListParams): Observable<void> {
    return this.files.download(`${environment.apiUrl}/payment-adjustment/export/${format}`, params);
  }
}
