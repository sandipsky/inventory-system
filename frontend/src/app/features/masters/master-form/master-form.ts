import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Button,
  DRAWER_DATA,
  DrawerRef,
  Icon,
  NotificationService,
  NumberInput,
  TextInput,
  Toggle,
} from '@lumen-ui/angular';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { MASTERS, MasterFormData, MasterPayload } from '../masters.model';
import { MastersService } from '../masters.service';

/**
 * Add or edit form for a unit, category, packing or tax type, opened in a 350px right
 * drawer from MasterList. The record to edit comes with DRAWER_DATA, so there is nothing
 * to load. Closes with `true` once saved.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, NumberInput, ReactiveFormsModule, TextInput, Toggle],
  selector: 'app-master-form',
  styleUrl: './master-form.scss',
  templateUrl: './master-form.html',
})
export class MasterForm {
  private readonly drawerRef = inject<DrawerRef<MasterForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<MasterFormData | null>(DRAWER_DATA, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly mastersService = inject(MastersService);
  private readonly notification = inject(NotificationService);

  readonly kind = this.data?.kind ?? 'category';
  readonly config = MASTERS[this.kind];
  private readonly record = this.data?.record;
  readonly editing = this.record !== undefined;

  readonly title = `${this.editing ? 'Edit' : 'Add'} ${this.config.singular}`;
  readonly subtitle = this.editing
    ? `Update the details of this ${this.config.singular.toLowerCase()}`
    : `Provide the details of the new ${this.config.singular.toLowerCase()}`;

  readonly saving = signal(false);

  readonly form = this.fb.group({
    name: this.fb.control(this.record?.name ?? '', Validators.required),
    tax_rate: this.fb.control<number | null>(this.record?.tax_rate ?? null, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    is_active: this.fb.control(this.record?.is_active ?? true),
  });

  constructor() {
    // Only tax types have a rate; a disabled control is left out of validation.
    if (!this.config.hasRate) this.form.controls.tax_rate.disable();
  }

  save() {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warn('Missing details', 'Fill in the fields highlighted in red.');
      return;
    }

    const value = this.form.getRawValue();
    const payload: MasterPayload = { name: value.name.trim(), is_active: value.is_active };
    if (this.config.hasRate) payload.tax_rate = value.tax_rate ?? 0;

    const singular = this.config.singular;
    const request = this.record
      ? this.mastersService.update(this.kind, this.record.id, payload)
      : this.mastersService.create(this.kind, payload);

    this.saving.set(true);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success(this.editing ? `${singular} updated` : `${singular} added`, response.message);
          this.drawerRef?.close(true);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  close() {
    this.drawerRef?.close(false);
  }
}
