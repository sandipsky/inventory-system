import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ledger, ReportRange, ReportRow } from './report.model';

/**
 * The reports (`/reports`): plain `GET` lists, not paged, each needing the View permission of what
 * it reads (see `REPORTS`). The dated ones take `fromDate` / `toDate`; leaving one out sets no limit.
 */
@Service()
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reports`;

  /** Every row of `GET /reports/<path>`, e.g. `rows('purchase/vendor', range)`. */
  rows<T = ReportRow>(path: string, range: ReportRange = {}): Observable<T[]> {
    return this.http.get<T[]>(`${this.baseUrl}/${path}`, { params: { ...range } });
  }

  /** One account's lines with a running balance, after its balance before `fromDate` (`ViewAccount`). */
  ledger(accountId: number, range: ReportRange = {}): Observable<Ledger> {
    return this.http.get<Ledger>(`${this.baseUrl}/accounting/ledger/${accountId}`, { params: { ...range } });
  }
}
