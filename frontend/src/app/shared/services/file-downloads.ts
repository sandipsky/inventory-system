import { Service, inject, signal } from '@angular/core';
import { NotificationService } from '@lumen-ui/angular';
import { Observable, finalize } from 'rxjs';
import { apiErrorMessage } from '../utils/api-error';
import { FileFormat } from '../utils/file';

/**
 * A page's Print (PDF) and Export (Excel) downloads: one at a time, `running` naming the one in
 * progress so its button can say so, a failure shown as a notification. Not a singleton: each
 * page lists it in its own `providers`.
 */
@Service({ autoProvided: false })
export class FileDownloads {
  private readonly notification = inject(NotificationService);

  private readonly current = signal<FileFormat | null>(null);
  readonly running = this.current.asReadonly();

  /** Starts `file` (a resource service's download) unless another one is still running. */
  run(format: FileFormat, file: Observable<void>) {
    if (this.current()) return;
    this.current.set(format);
    file.pipe(finalize(() => this.current.set(null))).subscribe({
      error: (error: unknown) =>
        this.notification.error(format === 'pdf' ? 'Print failed' : 'Export failed', apiErrorMessage(error)),
    });
  }
}
