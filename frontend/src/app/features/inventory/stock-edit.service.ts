import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../shared/models/api.model';
import { FileService } from '../../shared/services/file.service';
import { FileFormat } from '../../shared/utils/file';
import { StockBatch, StockEditPayload } from './inventory.model';

/**
 * Stock edit (`/stock-edit`): overwrites a product batch's quantity, prices and expiry date directly,
 * with no document or history. A batch is addressed by product id and `batch_id` (`0` = default batch).
 */
@Service()
export class StockEditService {
  private readonly http = inject(HttpClient);
  private readonly files = inject(FileService);
  private readonly baseUrl = `${environment.apiUrl}/stock-edit`;

  /** Every product batch with its current stock (filter e.g. `product.name`). */
  list(params: ListParams): Observable<Page<StockBatch>> {
    return this.http.get<Page<StockBatch>>(this.baseUrl, { params });
  }

  update(productId: number, batchId: number, stock: StockEditPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${productId}/${batchId}`, stock);
  }

  /** The batches `params` match (filters, dates, sort; not paged) as an Excel or PDF file. */
  exportList(format: FileFormat, params: ListParams): Observable<void> {
    return this.files.download(`${this.baseUrl}/export/${format}`, params);
  }
}
