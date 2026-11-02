import { HttpResponse } from '@angular/common/http';

/** What a page's Export (`excel`) and Print (`pdf`) download; the API builds both files. */
export type FileFormat = 'excel' | 'pdf';

/** Saves a file the API sent under the name its `Content-Disposition` gives, else `fallback`. */
export function saveFile(response: HttpResponse<Blob>, fallback = 'download'): void {
  const name = /filename="?([^";]+)"?/i.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? fallback;
  const url = URL.createObjectURL(response.body ?? new Blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
