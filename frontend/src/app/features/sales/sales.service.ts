import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../shared/models/api.model';
import { Sale, SalePayload } from './sales.model';

/** Sales invoices (`/sales`). They are never edited or deleted, only cancelled. */
@Service()
export class SalesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/sales`;

  list(params: ListParams): Observable<Page<Sale>> {
    return this.http.get<Page<Sale>>(this.baseUrl, { params });
  }

  get(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${this.baseUrl}/${id}`);
  }

  /** Preview of the next invoice number (plain text, e.g. `|SI-000001`). */
  nextNumber(): Observable<string> {
    return this.http.get(`${this.baseUrl}/generateNumber`, { responseType: 'text' });
  }

  create(sale: SalePayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, sale);
  }

  /** Puts the stock back and removes the journal; fails once the customer has paid against it. */
  cancel(id: number, remarks: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/${id}`, { cancel_remarks: remarks });
  }
}
