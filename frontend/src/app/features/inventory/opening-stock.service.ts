import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../shared/models/api.model';
import { OpeningStockPayload, StockBatch } from './inventory.model';

/**
 * Opening stock (`/opening-stock`): the stock on hand when the system is first used. It can only
 * be added; a batch's figures are corrected through stock adjustment or stock edit afterwards.
 */
@Service()
export class OpeningStockService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/opening-stock`;

  /** Every product batch with its current stock (filter e.g. `product.name`). */
  list(params: ListParams): Observable<Page<StockBatch>> {
    return this.http.get<Page<StockBatch>>(this.baseUrl, { params });
  }

  create(stock: OpeningStockPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, stock);
  }
}
