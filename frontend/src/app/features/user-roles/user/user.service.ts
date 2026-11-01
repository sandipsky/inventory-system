import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, ListParams, Page } from '../../../shared/models/api.model';
import { User, UserPayload } from './user.model';

/**
 * Users (`/users`). Saving is a multipart request: the details as a JSON `user` part and,
 * optionally, a new profile picture as `image`.
 */
@Service()
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  list(params: ListParams): Observable<Page<User>> {
    return this.http.get<Page<User>>(this.baseUrl, { params });
  }

  get(id: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  create(user: UserPayload, image?: File | null): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, toFormData(user, image));
  }

  /** Leaving out `image` keeps the current picture. */
  update(id: number, user: UserPayload, image?: File | null): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/${id}`, toFormData(user, image));
  }

  delete(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * How many users have `role`. The API deletes a role its users still point to, after which
   * listing those users fails, so a role is only deleted once this is 0.
   */
  countWithRole(role: { id: number; name: string }): Observable<number> {
    // Filters match by "contains", so a role named "Admin" also brings back "Sub Admin" users;
    // count only the exact role. The page is sized to hold every user.
    return this.list({ 'role.name': role.name, pageSize: 1000 }).pipe(
      map(page => page.content.filter(user => user.role_id === role.id).length),
    );
  }
}

function toFormData(user: UserPayload, image?: File | null): FormData {
  const body = new FormData();
  body.append('user', new Blob([JSON.stringify(user)], { type: 'application/json' }));
  if (image) body.append('image', image);
  return body;
}
