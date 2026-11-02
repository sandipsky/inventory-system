import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../shared/models/api.model';
import { FileService } from '../../shared/services/file.service';
import { FileFormat } from '../../shared/utils/file';
import { Purchase, PurchasePayload, Vendor } from './purchase.model';

/** Purchase entries (`/purchase`) and the vendor details the form shows. */
@Service()
export class PurchaseService {
  private readonly http = inject(HttpClient);
  private readonly files = inject(FileService);
  private readonly baseUrl = `${environment.apiUrl}/purchase`;

  list(params: ListParams): Observable<Page<Purchase>> {
    return this.http.get<Page<Purchase>>(this.baseUrl, { params });
  }

  get(id: number): Observable<Purchase> {
    return this.http.get<Purchase>(`${this.baseUrl}/${id}`);
  }

  /** Preview of the next entry number (plain text, e.g. `|PE-000001`). */
  nextNumber(): Observable<string> {
    return this.http.get(`${this.baseUrl}/generateNumber`, { responseType: 'text' });
  }

  create(purchase: PurchasePayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, purchase);
  }

  update(id: number, purchase: PurchasePayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, purchase);
  }

  /** Takes the purchased stock back out; fails once any of it has been sold. */
  delete(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }

  /** Needs `ViewVendor`. */
  vendor(id: number): Observable<Vendor> {
    return this.http.get<Vendor>(`${environment.apiUrl}/vendor/${id}`);
  }

  /** The purchases `params` match (filters, dates, sort; not paged) as an Excel or PDF file. */
  exportList(format: FileFormat, params: ListParams): Observable<void> {
    return this.files.download(`${this.baseUrl}/export/${format}`, params);
  }

  /** One purchase: its invoice as a PDF, or its lines as an Excel file. */
  exportOne(id: number, format: FileFormat, params: ListParams = {}): Observable<void> {
    return this.files.download(`${this.baseUrl}/${id}/export/${format}`, params);
  }

  /** Every purchase between `fromDate` and `toDate` as invoices in one PDF. */
  printRange(params: ListParams): Observable<void> {
    return this.files.download(`${this.baseUrl}/print`, params);
  }
}
