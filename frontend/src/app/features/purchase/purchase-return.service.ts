import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../shared/models/api.model';
import { FileService } from '../../shared/services/file.service';
import { FileFormat } from '../../shared/utils/file';
import { PurchaseReturn, PurchaseReturnPayload } from './purchase.model';

/** Purchase returns (`/purchase-return`): goods sent back to a vendor, taken out of stock. */
@Service()
export class PurchaseReturnService {
  private readonly http = inject(HttpClient);
  private readonly files = inject(FileService);
  private readonly baseUrl = `${environment.apiUrl}/purchase-return`;

  list(params: ListParams): Observable<Page<PurchaseReturn>> {
    return this.http.get<Page<PurchaseReturn>>(this.baseUrl, { params });
  }

  get(id: number): Observable<PurchaseReturn> {
    return this.http.get<PurchaseReturn>(`${this.baseUrl}/${id}`);
  }

  /** Preview of the next return number (plain text, e.g. `|PR-000001`). */
  nextNumber(): Observable<string> {
    return this.http.get(`${this.baseUrl}/generateNumber`, { responseType: 'text' });
  }

  create(purchaseReturn: PurchaseReturnPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, purchaseReturn);
  }

  update(id: number, purchaseReturn: PurchaseReturnPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, purchaseReturn);
  }

  /** Puts the returned goods back into stock. */
  delete(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }

  /** The purchase returns `params` match (filters, dates, sort; not paged) as an Excel or PDF file. */
  exportList(format: FileFormat, params: ListParams): Observable<void> {
    return this.files.download(`${this.baseUrl}/export/${format}`, params);
  }

  /** One purchase return as a PDF, or its lines as an Excel file. */
  exportOne(id: number, format: FileFormat, params: ListParams = {}): Observable<void> {
    return this.files.download(`${this.baseUrl}/${id}/export/${format}`, params);
  }

  /** Every purchase return between `fromDate` and `toDate` in one PDF. */
  printRange(params: ListParams): Observable<void> {
    return this.files.download(`${this.baseUrl}/print`, params);
  }
}
