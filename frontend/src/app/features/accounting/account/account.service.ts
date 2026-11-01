import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, DropdownItem, ListParams, Page } from '../../../shared/models/api.model';
import { Account, AccountPayload, AccountTypeGroup } from './account.model';

/** The chart of accounts (`/accountMaster`). */
@Service()
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/accountMaster`;

  list(params: ListParams): Observable<Page<Account>> {
    return this.http.get<Page<Account>>(this.baseUrl, { params });
  }

  types(): Observable<AccountTypeGroup[]> {
    return this.http.get<AccountTypeGroup[]>(`${this.baseUrl}/getAccountTypes`);
  }

  /** Accounts that can parent one of `type`: the active system accounts of that type. */
  parents(type: string): Observable<DropdownItem[]> {
    // Type names hold `&` and spaces, e.g. `Cash & Cash Equivalents`.
    return this.http.get<DropdownItem[]>(`${this.baseUrl}/getParentAccount/${encodeURIComponent(type)}`);
  }

  create(account: AccountPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, account);
  }

  update(id: number, account: AccountPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, account);
  }

  /** Fails for accounts that aren't `deletable`. */
  delete(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }
}
