import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Button,
  CalendarSystem,
  DRAWER_DATA,
  DateInput,
  DrawerRef,
  Icon,
  NotificationService,
  NumberInput,
} from '@lumen-ui/angular';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { batchName } from '../../../../shared/utils/batch';
import { fromIsoDate, toIsoDate } from '../../../../shared/utils/date';
import { StockBatch, StockEditFormData, StockEditPayload } from '../../inventory.model';
import { StockEditService } from '../../stock-edit.service';

/** Stands in when the form renders without drawer data, e.g. in tests. */
const NO_BATCH: StockBatch = {
  id: 0,
  product_id: 0,
  product_name: null,
  batch_id: 0,
  batch_no: null,
  expiry_date: null,
  quantity: 0,
  cost_price: null,
  selling_price: null,
  mrp: null,
};

/**
 * Overwrites one product batch's quantity, prices and expiry date, in a right drawer opened from
 * StockEditList. The batch comes with DRAWER_DATA, so nothing loads. Closes with `true` once saved.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DateInput, Icon, NumberInput, ReactiveFormsModule],
  selector: 'app-stock-edit-form',
  styleUrl: './stock-edit-form.scss',
  templateUrl: './stock-edit-form.html',
})
export class StockEditForm {
  private readonly drawerRef = inject<DrawerRef<StockEditForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<StockEditFormData | null>(DRAWER_DATA, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notification = inject(NotificationService);
  private readonly stockService = inject(StockEditService);

  readonly batch = this.data?.batch ?? NO_BATCH;
  readonly batchLabel = batchName(this.batch.batch_no);
  readonly calendar: CalendarSystem = this.data?.calendar ?? 'bs';

  readonly saving = signal(false);

  readonly form = this.fb.group({
    quantity: this.fb.control<number | null>(this.batch.quantity, [Validators.required, Validators.min(0)]),
    expiry_date: this.fb.control<Date | null>(fromIsoDate(this.batch.expiry_date)),
    cost_price: this.fb.control<number | null>(this.batch.cost_price, [Validators.required, Validators.min(0)]),
    selling_price: this.fb.control<number | null>(this.batch.selling_price, Validators.min(0)),
    mrp: this.fb.control<number | null>(this.batch.mrp, Validators.min(0)),
  });

  save() {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warn('Missing details', 'Fill in the fields highlighted in red.');
      return;
    }

    // Required fields are checked above, so the non-null assertions hold.
    const value = this.form.getRawValue();
    const payload: StockEditPayload = {
      quantity: value.quantity!,
      cost_price: value.cost_price!,
      selling_price: value.selling_price ?? 0,
      mrp: value.mrp ?? 0,
      expiry_date: value.expiry_date ? toIsoDate(value.expiry_date) : null,
    };

    this.saving.set(true);
    this.stockService
      .update(this.batch.product_id, this.batch.batch_id, payload)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success('Stock updated', response.message);
          this.drawerRef?.close(true);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  close() {
    this.drawerRef?.close(false);
  }
}
