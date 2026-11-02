import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../../shared/models/api.model';
import { FileService } from '../../../shared/services/file.service';
import { FileFormat } from '../../../shared/utils/file';
import { Journal, JournalPayload } from './journal.model';

/**
 * Manual journal entries (`/journal`). The journals purchases, sales, returns and payments post
 * aren't listed, and the API refuses to change them here; so is the opening balance.
 */
@Service()
export class JournalService {
  private readonly http = inject(HttpClient);
  private readonly files = inject(FileService);
  private readonly baseUrl = `${environment.apiUrl}/journal`;

  list(params: ListParams): Observable<Page<Journal>> {
    return this.http.get<Page<Journal>>(this.baseUrl, { params });
  }

  get(id: number): Observable<Journal> {
    return this.http.get<Journal>(`${this.baseUrl}/${id}`);
  }

  /** Preview of the next journal number (plain text, e.g. `|J-000001`). */
  nextNumber(): Observable<string> {
    return this.http.get(`${this.baseUrl}/generateNumber`, { responseType: 'text' });
  }

  create(journal: JournalPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, journal);
  }

  update(id: number, journal: JournalPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, journal);
  }

  delete(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }

  /** Every line of the journals `params` match (filters, dates, sort; not paged) as an Excel or PDF file. */
  exportList(format: FileFormat, params: ListParams): Observable<void> {
    return this.files.download(`${this.baseUrl}/export/${format}`, params);
  }

  /** One journal as a PDF voucher, or its lines as an Excel file. */
  exportOne(id: number, format: FileFormat, params: ListParams = {}): Observable<void> {
    return this.files.download(`${this.baseUrl}/${id}/export/${format}`, params);
  }
}
