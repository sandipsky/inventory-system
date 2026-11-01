import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/api.model';
import { Configuration } from './configuration.model';

/** Company settings (`/configurations`). Reading them needs no login. */
@Service()
export class ConfigurationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/configurations`;

  list(): Observable<Configuration[]> {
    return this.http.get<Configuration[]>(this.baseUrl);
  }

  /** Saves several settings in one transaction; fails if any of them isn't editable. */
  update(settings: Configuration[]): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/edit`, settings);
  }
}
