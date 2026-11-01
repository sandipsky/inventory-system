import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../../shared/models/api.model';
import { OperationGroup, Role, RolePayload } from './role.model';

/** Roles (`/roles`): named sets of the operations their users may perform. */
@Service()
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/roles`;

  list(params: ListParams): Observable<Page<Role>> {
    return this.http.get<Page<Role>>(this.baseUrl, { params });
  }

  get(id: number): Observable<Role> {
    return this.http.get<Role>(`${this.baseUrl}/${id}`);
  }

  /** Every operation, grouped. Role `0` is none, so nothing comes back selected. */
  operations(): Observable<OperationGroup[]> {
    return this.http.get<OperationGroup[]>(`${this.baseUrl}/operations/0`);
  }

  create(role: RolePayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, role);
  }

  update(id: number, role: RolePayload): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, role);
  }

  /** Check `UserService.countWithRole` first: the API deletes a role its users still have. */
  delete(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }
}
