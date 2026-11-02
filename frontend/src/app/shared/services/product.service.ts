import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../models/api.model';
import { BatchStock, ProductDetail, ProductPayload } from '../models/product.model';
import { FileFormat } from '../utils/file';
import { FileService } from './file.service';

/**
 * Products (`/products`): the product master, and the lookups the purchase, sales and
 * inventory documents make for their lines. Reading needs `ViewProduct`.
 */
@Service()
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly files = inject(FileService);
  private readonly baseUrl = `${environment.apiUrl}/products`;

  /** Besides field filters, `productType` takes `purchasable`, `sellable` or `both`. */
  list(params: ListParams): Observable<Page<ProductDetail>> {
    return this.http.get<Page<ProductDetail>>(this.baseUrl, { params });
  }

  get(id: number): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${this.baseUrl}/${id}`);
  }

  /** The product's batches and their stock. A product never stocked has one empty default batch. */
  stockInfo(id: number): Observable<BatchStock[]> {
    return this.http.get<BatchStock[]>(`${this.baseUrl}/stockInfo/${id}`);
  }

  create(product: ProductPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, product);
  }

  update(id: number, product: ProductPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, product);
  }

  delete(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }

  /** The products `params` match (filters, dates, sort; not paged) as an Excel or PDF file. */
  exportList(format: FileFormat, params: ListParams): Observable<void> {
    return this.files.download(`${this.baseUrl}/export/${format}`, params);
  }
}
