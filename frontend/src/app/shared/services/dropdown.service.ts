import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DropdownItem } from '../models/api.model';

/** `active` lists active records only; `all` includes inactive ones. */
export type DropdownStatus = 'active' | 'all';
export type ProductServiceType = 'inventory' | 'service' | 'all';
export type ProductTradeType = 'purchasable' | 'sellable' | 'all';
/** `party` accounts belong to a vendor or customer; `nonparty` ones don't. */
export type AccountScope = 'party' | 'nonparty' | 'all';
export type AccountPartyType = 'vendor' | 'customer' | 'all';

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

  customers(status: DropdownStatus = 'active'): Observable<DropdownItem[]> {
    return this.http.get<DropdownItem[]>(`${this.baseUrl}/customer/${status}`);
  }

  categories(status: DropdownStatus = 'active'): Observable<DropdownItem[]> {
    return this.http.get<DropdownItem[]>(`${this.baseUrl}/category/${status}`);
  }

  units(status: DropdownStatus = 'active'): Observable<DropdownItem[]> {
    return this.http.get<DropdownItem[]>(`${this.baseUrl}/units/${status}`);
  }

  packings(status: DropdownStatus = 'active'): Observable<DropdownItem[]> {
    return this.http.get<DropdownItem[]>(`${this.baseUrl}/packings/${status}`);
  }

  taxTypes(status: DropdownStatus = 'active'): Observable<DropdownItem[]> {
    return this.http.get<DropdownItem[]>(`${this.baseUrl}/taxtypes/${status}`);
  }

  roles(status: DropdownStatus = 'active'): Observable<DropdownItem[]> {
    return this.http.get<DropdownItem[]>(`${this.baseUrl}/roles/${status}`);
  }

  /** e.g. `products('inventory', 'purchasable')` for the purchase line picker. */
  products(
    serviceType: ProductServiceType = 'all',
    type: ProductTradeType = 'all',
    status: DropdownStatus = 'active',
  ): Observable<DropdownItem[]> {
    return this.http.get<DropdownItem[]>(`${this.baseUrl}/products/${serviceType}/${type}/${status}`);
  }

  /** A vendor's purchases, newest first; `name` is the raw `system_entry_no`. */
  purchases(vendorId: number): Observable<DropdownItem[]> {
    return this.http.get<DropdownItem[]>(`${this.baseUrl}/purchase/${vendorId}`);
  }

  /** A customer's sales that are not cancelled, newest first; `name` is the raw `system_entry_no`. */
  sales(customerId: number): Observable<DropdownItem[]> {
    return this.http.get<DropdownItem[]>(`${this.baseUrl}/sales/${customerId}`);
  }

  /** Chart of accounts entries, e.g. `accounts('party', 'vendor')` for vendor accounts. */
  accounts(
    scope: AccountScope = 'all',
    partyType: AccountPartyType = 'all',
    status: DropdownStatus = 'active',
  ): Observable<DropdownItem[]> {
    return this.http.get<DropdownItem[]>(`${this.baseUrl}/accountMaster/${scope}/${partyType}/${status}`);
  }
}
