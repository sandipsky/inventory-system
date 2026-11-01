import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../shared/models/api.model';
import { StockAdjustment, StockAdjustmentPayload } from './inventory.model';

/**
 * Stock adjustments (`/stock-adjustment`): stock moved in or out of product batches after a count,
 * breakage or loss. Updating or deleting one reverses its earlier stock changes first.
 */
@Service()
export class StockAdjustmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/stock-adjustment`;

  /** The rows carry no lines. */
  list(params: ListParams): Observable<Page<StockAdjustment>> {
    return this.http.get<Page<StockAdjustment>>(this.baseUrl, { params });
  }

  get(id: number): Observable<StockAdjustment> {
    return this.http.get<StockAdjustment>(`${this.baseUrl}/${id}`);
  }

  /** Preview of the next adjustment number (plain text, e.g. `|SA-000001`). Needs `CreateStockAdjustment`. */
  nextNumber(): Observable<string> {
    return this.http.get(`${this.baseUrl}/generateNumber`, { responseType: 'text' });
  }

  create(adjustment: StockAdjustmentPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, adjustment);
  }

  update(id: number, adjustment: StockAdjustmentPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, adjustment);
  }

  delete(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }
}
