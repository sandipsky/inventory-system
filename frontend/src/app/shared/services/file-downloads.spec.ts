import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from '@lumen-ui/angular';
import { Observable, Subject, throwError } from 'rxjs';
import { FileDownloads } from './file-downloads';

describe('FileDownloads', () => {
  let downloads: FileDownloads;
  const error = vi.fn();

  beforeEach(() => {
    error.mockClear();
    TestBed.configureTestingModule({
      providers: [FileDownloads, { provide: NotificationService, useValue: { error } }],
    });
    downloads = TestBed.inject(FileDownloads);
  });

  it('runs one download at a time and names the one running', () => {
    const print = new Subject<void>();
    const exportStarted = vi.fn();

    downloads.run('pdf', print);
    downloads.run('excel', new Observable<void>(() => exportStarted()));

    expect(downloads.running()).toBe('pdf');
    expect(exportStarted).not.toHaveBeenCalled();
    print.complete();
    expect(downloads.running()).toBeNull();
  });

  it("shows a failure with the API's message", () => {
    const failure = new HttpErrorResponse({ status: 404, error: { message: 'No sales in this period' } });

    downloads.run('pdf', throwError(() => failure));
    downloads.run('excel', throwError(() => failure));

    expect(error).toHaveBeenCalledWith('Print failed', 'No sales in this period');
    expect(error).toHaveBeenCalledWith('Export failed', 'No sales in this period');
    expect(downloads.running()).toBeNull();
  });
});
