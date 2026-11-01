import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../shared/models/api.model';
import { Purchase, PurchasePayload, Vendor } from './purchase.model';

/** Purchase entries (`/purchase`) and the vendor details the form shows. */
@Service()
export class PurchaseService {
  private readonly http = inject(HttpClient);
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
}
