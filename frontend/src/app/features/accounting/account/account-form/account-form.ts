import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Button,
  DRAWER_DATA,
  DrawerRef,
  Icon,
  NotificationService,
  Select,
  TextInput,
  Textarea,
  Toggle,
} from '@lumen-ui/angular';
import { Observable, catchError, distinctUntilChanged, finalize, of, startWith, switchMap } from 'rxjs';
import { DropdownItem } from '../../../../shared/models/api.model';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { withMissing } from '../../../../shared/utils/options';
import { AccountFormData, AccountOwner, AccountPayload } from '../account.model';
import { AccountService } from '../account.service';

const LOCK_NOTES: Record<AccountOwner, string> = {
  system: 'System account. The app relies on its name, type and parent, so they can’t be changed.',
  vendor: 'Vendor account. Its name, type and parent follow the vendor and are reset whenever the vendor is saved.',
  customer:
    'Customer account. Its name, type and parent follow the customer and are reset whenever the customer is saved.',
};

/**
 * Add or edit form for an account, opened in a right drawer from AccountList. The record to
 * edit comes with DRAWER_DATA; only the type and parent lists load. Closes with `true` once saved.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, ReactiveFormsModule, Select, TextInput, Textarea, Toggle],
  selector: 'app-account-form',
  styleUrl: './account-form.scss',
  templateUrl: './account-form.html',
})
export class AccountForm {
  private readonly drawerRef = inject<DrawerRef<AccountForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<AccountFormData | null>(DRAWER_DATA, { optional: true });
  private readonly accountService = inject(AccountService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notification = inject(NotificationService);

  private readonly record = this.data?.record;
  readonly editing = this.record !== undefined;
  readonly lockNote = this.data?.owner ? LOCK_NOTES[this.data.owner] : '';

  readonly title = this.editing ? 'Edit Account' : 'Add Account';
  readonly subtitle = this.editing ? 'Update the details of this account' : 'Provide the details of the new account';

  readonly saving = signal(false);

  readonly form = this.fb.group({
    account_name: this.fb.control(this.record?.account_name ?? '', Validators.required),
    // The API reads a missing code as a duplicate of the accounts that have none.
    account_code: this.fb.control(this.record?.account_code ?? '', Validators.required),
    account_type: this.fb.control<string | null>(this.record?.account_type ?? null, Validators.required),
    parent_id: this.fb.control<number | null>(this.record?.parent_id || null),
    is_active: this.fb.control(this.record?.is_active ?? true),
    remarks: this.fb.control(this.record?.remarks ?? ''),
  });

  private readonly accountType$ = this.form.controls.account_type.valueChanges.pipe(
    startWith(this.form.controls.account_type.value),
    distinctUntilChanged(),
  );
  readonly accountType = toSignal(this.accountType$, { requireSync: true });

  private readonly typeGroups = toSignal(this.lookup(this.accountService.types(), 'account types'), {
    initialValue: [],
  });
  readonly typeOptions = computed(() =>
    this.typeGroups().flatMap(group => group.types.map(name => ({ name, heading: group.heading }))),
  );

  private readonly parentList = toSignal(
    this.accountType$.pipe(
      switchMap(type => (type ? this.lookup(this.accountService.parents(type), 'parent accounts') : of([]))),
    ),
    { initialValue: [] },
  );
  /** The saved parent, which the active-only parent list may no longer hold. */
  private readonly savedParent: DropdownItem[] = this.record?.parent_id
    ? [{ id: this.record.parent_id, name: this.record.parent_account_name ?? '' }]
    : [];
  readonly parentOptions = computed(() => {
    // A system account can show up among the parents of its own type.
    const items = this.parentList().filter(item => item.id !== this.record?.id);
    return this.accountType() === this.record?.account_type ? withMissing(items, this.savedParent) : items;
  });

  constructor() {
    if (this.lockNote) {
      this.form.controls.account_name.disable();
      this.form.controls.account_type.disable();
      this.form.controls.parent_id.disable();
    }
  }

  /** A parent belongs to one type, so picking another type clears it. */
  onTypeChange() {
    this.form.controls.parent_id.setValue(null);
  }

  save() {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warn('Missing details', 'Fill in the fields highlighted in red.');
      return;
    }

    // Locked fields are disabled, so read them with getRawValue. The type is required above.
    const value = this.form.getRawValue();
    const parent = this.parentOptions().find(item => item.id === value.parent_id);
    const payload: AccountPayload = {
      account_code: value.account_code.trim(),
      account_name: value.account_name.trim(),
      account_type: value.account_type!,
      parent_id: parent?.id ?? 0,
      parent_account_name: parent?.name ?? null,
      is_active: value.is_active,
      // Stored as sent, so a system account has to say again that it can't be deleted.
      deletable: this.record?.deletable ?? true,
      remarks: value.remarks.trim() || null,
    };

    const request = this.record
      ? this.accountService.update(this.record.id, payload)
      : this.accountService.create(payload);

    this.saving.set(true);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success(this.editing ? 'Account updated' : 'Account added', response.message);
          this.drawerRef?.close(true);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  close() {
    this.drawerRef?.close(false);
  }

  private lookup<T>(source: Observable<T[]>, what: string): Observable<T[]> {
    return source.pipe(
      catchError((error: unknown) => {
        this.notification.error(`Could not load ${what}`, apiErrorMessage(error));
        return of([]);
      }),
    );
  }
}
