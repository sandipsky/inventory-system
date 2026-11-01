import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../shared/models/api.model';
import { MASTERS, MasterKind, MasterPayload, MasterRecord } from './masters.model';

/** Units, categories, packings and tax types (`/master/...`), which share one set of endpoints. */
@Service()
export class MastersService {
  private readonly http = inject(HttpClient);

  list(kind: MasterKind, params: ListParams): Observable<Page<MasterRecord>> {
    return this.http.get<Page<MasterRecord>>(this.url(kind), { params });
  }

  create(kind: MasterKind, record: MasterPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.url(kind), record);
  }

  update(kind: MasterKind, id: number, record: MasterPayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.url(kind)}/${id}`, record);
  }

  delete(kind: MasterKind, id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.url(kind)}/${id}`);
  }

  private url(kind: MasterKind): string {
    return `${environment.apiUrl}/master/${MASTERS[kind].path}`;
  }
}
