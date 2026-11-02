import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../shared/models/api.model';
import { FileService } from '../../shared/services/file.service';
import { FileFormat } from '../../shared/utils/file';
import { SalesReturn, SalesReturnPayload } from './sales.model';

/** Sales returns (`/sales-return`): goods a customer brings back. Never edited or deleted, only cancelled. */
@Service()
export class SalesReturnService {
  private readonly http = inject(HttpClient);
  private readonly files = inject(FileService);
  private readonly baseUrl = `${environment.apiUrl}/sales-return`;

  list(params: ListParams): Observable<Page<SalesReturn>> {
    return this.http.get<Page<SalesReturn>>(this.baseUrl, { params });
  }

  get(id: number): Observable<SalesReturn> {
    return this.http.get<SalesReturn>(`${this.baseUrl}/${id}`);
  }

  /** Preview of the next return number (plain text, e.g. `|SR-000001`). */
  nextNumber(): Observable<string> {
    return this.http.get(`${this.baseUrl}/generateNumber`, { responseType: 'text' });
  }

  create(salesReturn: SalesReturnPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, salesReturn);
  }

  /** Takes the returned goods back out of stock; fails once any of them has been sold again. */
  cancel(id: number, remarks: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/${id}`, { cancel_remarks: remarks });
  }

  /** The sales returns `params` match (filters, dates, sort; not paged) as an Excel or PDF file. */
  exportList(format: FileFormat, params: ListParams): Observable<void> {
    return this.files.download(`${this.baseUrl}/export/${format}`, params);
  }

  /** One sales return as a PDF, or its lines as an Excel file. */
  exportOne(id: number, format: FileFormat, params: ListParams = {}): Observable<void> {
    return this.files.download(`${this.baseUrl}/${id}/export/${format}`, params);
  }

  /** Every sales return between `fromDate` and `toDate` in one PDF, cancelled ones marked. */
  printRange(params: ListParams): Observable<void> {
    return this.files.download(`${this.baseUrl}/print`, params);
  }
}
