import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Button,
  Card,
  DRAWER_DATA,
  DrawerRef,
  EmailInput,
  Icon,
  IconName,
  NotificationService,
  Skeleton,
  TextInput,
  Textarea,
  Toggle,
} from '@lumen-ui/angular';
import { finalize } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { PARTIES, Party, PartyFormData, PartyFormMode, PartyPayload } from '../party.model';
import { PartyService } from '../party.service';

const ICONS: Record<PartyFormMode, IconName> = { add: 'add', edit: 'edit', view: 'eye' };

/**
 * Vendor or customer form, opened in a near full-screen bottom drawer from PartyList in one of
 * three modes (see PartyFormData). Edit and view load the party by id. Closes with `true`
 * once saved.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Card, EmailInput, Icon, ReactiveFormsModule, Skeleton, TextInput, Textarea, Toggle],
  selector: 'app-party-form',
  styleUrl: './party-form.scss',
  templateUrl: './party-form.html',
})
export class PartyForm {
  private readonly drawerRef = inject<DrawerRef<PartyForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<PartyFormData | null>(DRAWER_DATA, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly partyService = inject(PartyService);
  private readonly notification = inject(NotificationService);

  readonly kind = this.data?.kind ?? 'vendor';
  readonly config = PARTIES[this.kind];
  readonly mode = signal<PartyFormMode>(this.data?.mode ?? 'add');
  readonly id = signal<number | undefined>(this.data?.id);

  readonly readonly = computed(() => this.mode() === 'view');
  readonly canEdit = computed(() => this.auth.hasOperation(`Edit${this.config.operation}`));
  readonly icon = computed(() => ICONS[this.mode()]);
  readonly title = computed(() => {
    const singular = this.config.singular;
    return { add: `Add ${singular}`, edit: `Edit ${singular}`, view: singular }[this.mode()];
  });
  readonly subtitle = computed(() => {
    const singular = this.config.singular.toLowerCase();
    return {
      add: `Provide the details of the new ${singular}`,
      edit: `Update the details of this ${singular}`,
      view: `Details of this ${singular}`,
    }[this.mode()];
  });

  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    name: this.fb.control('', Validators.required),
    registration_number: this.fb.control(''),
    contact: this.fb.control(''),
    email: this.fb.control(''),
    address: this.fb.control(''),
    remarks: this.fb.control(''),
    is_active: this.fb.control(true),
  });

  constructor() {
    const id = this.id();
    if (this.mode() !== 'add' && id) {
      this.load(id);
    } else {
      this.mode.set('add');
    }
  }

  startEdit() {
    this.mode.set('edit');
  }

  save() {
    if (this.saving() || this.loading()) return;
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
    const id = this.id();
    const editing = this.mode() === 'edit' && id !== undefined;
    const request = editing
      ? this.partyService.update(this.kind, id, payload)
      : this.partyService.create(this.kind, payload);

    this.saving.set(true);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success(editing ? `${singular} updated` : `${singular} added`, response.message);
          this.drawerRef?.close(true);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  close() {
    this.drawerRef?.close(false);
  }

  private load(id: number) {
    this.loading.set(true);
    this.partyService
      .get(this.kind, id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: party => this.fill(party),
        error: (error: unknown) => {
          this.notification.error(`Could not load the ${this.config.singular.toLowerCase()}`, apiErrorMessage(error));
          this.close();
        },
      });
  }

  private fill(party: Party) {
    this.form.patchValue({
      name: party.name,
      registration_number: party.registration_number ?? '',
      contact: party.contact ?? '',
      email: party.email ?? '',
      address: party.address ?? '',
      remarks: party.remarks ?? '',
      is_active: party.is_active,
    });
    this.form.markAsPristine();
  }
}
