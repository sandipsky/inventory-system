import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ListParams } from '../models/api.model';
import { saveFile } from '../utils/file';

/**
 * Downloads the Excel and PDF files the API builds: a GET with the auth header (a plain link
 * couldn't send it), saved under the file name the API gives. The resource services name the URLs.
 */
@Service()
export class FileService {
  private readonly http = inject(HttpClient);

  download(url: string, params: ListParams = {}): Observable<void> {
    return this.http
      .get(url, { params, observe: 'response', responseType: 'blob' })
      .pipe(map(response => saveFile(response)));
  }
}
