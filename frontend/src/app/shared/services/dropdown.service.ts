import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DropdownItem } from '../models/api.model';

/** `active` lists active records only; `all` includes inactive ones. */
export type DropdownStatus = 'active' | 'all';
export type ProductServiceType = 'inventory' | 'service' | 'all';
export type ProductTradeType = 'purchasable' | 'sellable' | 'all';

/**
 * `{ id, name }` lists for select boxes (`GET /dropdown/...`). Not paged, and they
 * only need a valid login, not a specific permission.
 */
@Service()
export class DropdownService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dropdown`;

  vendors(status: DropdownStatus = 'active'): Observable<DropdownItem[]> {
    return this.http.get<DropdownItem[]>(`${this.baseUrl}/vendor/${status}`);
  }

  /** e.g. `products('inventory', 'purchasable')` for the purchase line picker. */
  products(
    serviceType: ProductServiceType = 'all',
    type: ProductTradeType = 'all',
    status: DropdownStatus = 'active',
  ): Observable<DropdownItem[]> {
    return this.http.get<DropdownItem[]>(`${this.baseUrl}/products/${serviceType}/${type}/${status}`);
  }
}
