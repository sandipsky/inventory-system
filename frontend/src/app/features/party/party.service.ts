import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../shared/models/api.model';
import { PARTIES, Party, PartyKind, PartyPayload } from './party.model';

/**
 * Vendors (`/vendor`) and customers (`/customer`), which share one set of endpoints. Creating
 * one also creates its account in the chart of accounts; saving it renames that account.
 */
@Service()
export class PartyService {
  private readonly http = inject(HttpClient);

  list(kind: PartyKind, params: ListParams): Observable<Page<Party>> {
    return this.http.get<Page<Party>>(this.url(kind), { params });
  }

  get(kind: PartyKind, id: number): Observable<Party> {
    return this.http.get<Party>(`${this.url(kind)}/${id}`);
  }

  create(kind: PartyKind, party: PartyPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.url(kind), party);
  }

  update(kind: PartyKind, id: number, party: PartyPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.url(kind)}/${id}`, party);
  }

  delete(kind: PartyKind, id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.url(kind)}/${id}`);
  }

  private url(kind: PartyKind): string {
    return `${environment.apiUrl}/${PARTIES[kind].path}`;
  }
}
