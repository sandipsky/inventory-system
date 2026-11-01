import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button, MODAL_DATA, ModalRef, Textarea } from '@lumen-ui/angular';
import { Observable } from 'rxjs';

export interface CancelDialogData {
  title: string;
  message: string;
  /** Label of the confirm button, e.g. `Cancel Invoice`. */
  confirmText: string;
  /** Cancels with the typed reason. The dialog closes with `true` once it succeeds and stays open on error. */
  onConfirm: (remarks: string) => Observable<unknown>;
}

/** Asks why a sale or return is being cancelled, then cancels it. Open it with `ModalService`. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, ReactiveFormsModule, Textarea],
  selector: 'app-cancel-dialog',
  styleUrl: './cancel-dialog.scss',
  templateUrl: './cancel-dialog.html',
})
export class CancelDialog {
  readonly ref = inject<ModalRef<CancelDialog, boolean>>(ModalRef);
  readonly data = inject<CancelDialogData>(MODAL_DATA);

  readonly remarks = inject(NonNullableFormBuilder).control('', Validators.required);
  readonly cancelling = signal(false);

  confirm() {
    if (this.cancelling()) return;
    const remarks = this.remarks.value.trim();
    if (!remarks) {
      this.remarks.setValue('');
      this.remarks.markAsTouched();
      return;
    }

    // Like Lumen's ConfirmDialog: no closing mid-request, and an error keeps the dialog open.
    this.ref.config.disableClose = true;
    this.cancelling.set(true);
    this.data.onConfirm(remarks).subscribe({
      next: () => {
        this.ref.config.disableClose = false;
        this.ref.close(true);
      },
      error: () => {
        this.ref.config.disableClose = false;
        this.cancelling.set(false);
      },
    });
  }
}
