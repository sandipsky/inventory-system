import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { FileService } from './file.service';

describe('FileService', () => {
  const url = `${environment.apiUrl}/sales/export/excel`;
  const { createObjectURL, revokeObjectURL } = URL;
  let saved: string[];

  beforeEach(() => {
    saved = [];
    // jsdom has no object URLs; the link click is where the browser would save the file
    URL.createObjectURL = vi.fn(() => 'blob:file');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      saved.push(this.download);
    });
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  });

  afterEach(() => {
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    vi.restoreAllMocks();
    TestBed.inject(HttpTestingController).verify();
  });

  it('GETs the file as a blob with the params and saves it under the name the API gives', () => {
    const done = vi.fn();
    TestBed.inject(FileService).download(url, { fromDate: '2026-11-01', calendar: 'bs' }).subscribe(done);

    const req = TestBed.inject(HttpTestingController).expectOne(request => request.url === url);
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('fromDate')).toBe('2026-11-01');
    expect(req.request.params.get('calendar')).toBe('bs');
    req.flush(new Blob(['xlsx']), {
      headers: { 'Content-Disposition': 'attachment; filename="sales-2083-07-16.xlsx"' },
    });

    expect(saved).toEqual(['sales-2083-07-16.xlsx']);
    expect(done).toHaveBeenCalled();
  });
});
