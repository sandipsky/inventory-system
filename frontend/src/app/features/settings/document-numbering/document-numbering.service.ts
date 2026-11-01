import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DocumentNumbering } from './document-numbering.model';

/** Number formats for each document type (`/documentNumbering`). The API only reads them. */
@Service()
export class DocumentNumberingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/documentNumbering`;

  list(): Observable<DocumentNumbering[]> {
    return this.http.get<DocumentNumbering[]>(this.baseUrl);
  }
}
