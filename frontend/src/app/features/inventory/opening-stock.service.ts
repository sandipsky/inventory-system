import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../shared/models/api.model';
import { FileService } from '../../shared/services/file.service';
import { FileFormat } from '../../shared/utils/file';
import { OpeningStockPayload, StockBatch } from './inventory.model';

/**
 * Opening stock (`/opening-stock`): the stock on hand when the system is first used. It can only
 * be added; a batch's figures are corrected through stock adjustment or stock edit afterwards.
 */
@Service()
export class OpeningStockService {
  private readonly http = inject(HttpClient);
  private readonly files = inject(FileService);
  private readonly baseUrl = `${environment.apiUrl}/opening-stock`;

  /** Every product batch with its current stock (filter e.g. `product.name`). */
  list(params: ListParams): Observable<Page<StockBatch>> {
    return this.http.get<Page<StockBatch>>(this.baseUrl, { params });
  }

  create(stock: OpeningStockPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, stock);
  }

  /** The batches `params` match (filters, dates, sort; not paged) as an Excel or PDF file. */
  exportList(format: FileFormat, params: ListParams): Observable<void> {
    return this.files.download(`${this.baseUrl}/export/${format}`, params);
  }
}
