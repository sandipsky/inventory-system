import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/api.model';
import { Journal, JournalPayload } from '../journal/journal.model';

/** The one opening balance (`/opening-balance`): a journal of the balances the books start with. */
@Service()
export class OpeningBalanceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/opening-balance`;

  /** `id` is 0 and `journalEntries` `null` until one is saved. */
  get(): Observable<Journal> {
    return this.http.get<Journal>(this.baseUrl);
  }

  /** Replaces the opening balance. Debits must equal credits. */
  save(openingBalance: JournalPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, openingBalance);
  }
}
