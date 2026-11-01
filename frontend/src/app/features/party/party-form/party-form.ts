import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Button,
  DRAWER_DATA,
  DrawerRef,
  EmailInput,
  Icon,
  NotificationService,
  TextInput,
  Textarea,
  Toggle,
} from '@lumen-ui/angular';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { PARTIES, PartyFormData, PartyPayload } from '../party.model';
import { PartyService } from '../party.service';

/**
 * Add or edit form for a vendor or customer, opened in a right drawer from PartyList. The
 * record to edit comes with DRAWER_DATA, so there is nothing to load. Closes with `true`
 * once saved.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, EmailInput, Icon, ReactiveFormsModule, TextInput, Textarea, Toggle],
  selector: 'app-party-form',
  styleUrl: './party-form.scss',
  templateUrl: './party-form.html',
})
export class PartyForm {
  private readonly drawerRef = inject<DrawerRef<PartyForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<PartyFormData | null>(DRAWER_DATA, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly partyService = inject(PartyService);
  private readonly notification = inject(NotificationService);

  readonly kind = this.data?.kind ?? 'vendor';
  readonly config = PARTIES[this.kind];
  private readonly record = this.data?.record;
  readonly editing = this.record !== undefined;

  readonly title = `${this.editing ? 'Edit' : 'Add'} ${this.config.singular}`;
  readonly subtitle = this.editing
    ? `Update the details of this ${this.config.singular.toLowerCase()}`
    : `Provide the details of the new ${this.config.singular.toLowerCase()}`;

  readonly saving = signal(false);

  readonly form = this.fb.group({
    name: this.fb.control(this.record?.name ?? '', Validators.required),
    registration_number: this.fb.control(this.record?.registration_number ?? ''),
    contact: this.fb.control(this.record?.contact ?? ''),
    email: this.fb.control(this.record?.email ?? ''),
    address: this.fb.control(this.record?.address ?? ''),
    remarks: this.fb.control(this.record?.remarks ?? ''),
    is_active: this.fb.control(this.record?.is_active ?? true),
  });

  save() {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warn('Missing details', 'Fill in the fields highlighted in red.');
      return;
    }

    const value = this.form.getRawValue();
    const payload: PartyPayload = {
      name: value.name.trim(),
      registration_number: value.registration_number.trim(),
      contact: value.contact.trim(),
      email: value.email.trim(),
      address: value.address.trim(),
      remarks: value.remarks.trim(),
      is_active: value.is_active,
    };

    const singular = this.config.singular;
    const request = this.record
      ? this.partyService.update(this.kind, this.record.id, payload)
      : this.partyService.create(this.kind, payload);

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
