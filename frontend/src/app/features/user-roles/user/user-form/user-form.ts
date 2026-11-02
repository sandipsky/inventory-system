import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Button,
  Card,
  DRAWER_DATA,
  DrawerRef,
  EmailInput,
  FileUpload,
  Icon,
  IconName,
  NotificationService,
  PasswordInput,
  RejectReason,
  Select,
  Skeleton,
  TextInput,
  Textarea,
  Toggle,
  UploadFile,
  UsernameInput,
} from '@lumen-ui/angular';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { UserAvatar } from '../../../../shared/components/user-avatar/user-avatar';
import { DropdownService } from '../../../../shared/services/dropdown.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { withMissing } from '../../../../shared/utils/options';
import { STRONG_PASSWORD } from '../../../../shared/utils/password';
import { GENDERS, User, UserFormData, UserFormMode, UserPayload } from '../user.model';
import { UserService } from '../user.service';

const HEADINGS: Record<UserFormMode, { title: string; subtitle: string; icon: IconName }> = {
  add: { title: 'Add User', subtitle: 'Provide the details of the new user', icon: 'add' },
  edit: { title: 'Edit User', subtitle: 'Update the details of this user', icon: 'edit' },
  view: { title: 'User', subtitle: 'Details of this user', icon: 'eye' },
};

/** The API checks the file extension; it keeps uploads up to 10 MB. */
const PICTURE_TYPES = '.jpg,.jpeg,.png,.gif,.webp';
const PICTURE_MAX_MB = 10;

const REJECT_MESSAGES: Partial<Record<RejectReason, string>> = {
  type: 'Pick a JPG, PNG, GIF or WEBP picture.',
  size: `Pick a picture of at most ${PICTURE_MAX_MB} MB.`,
};

/**
 * User form, opened in a near full-screen bottom drawer from UserList in one of three modes
 * (see UserFormData). Edit and view load the user by id. Closes with `true` once saved.
 *
 * On your own account the role and status are locked, so you can't lock yourself out, and a new
 * username logs you out: the session token names the old one.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Button,
    Card,
    EmailInput,
    FileUpload,
    Icon,
    PasswordInput,
    ReactiveFormsModule,
    Select,
    Skeleton,
    TextInput,
    Textarea,
    Toggle,
    UserAvatar,
    UsernameInput,
  ],
  selector: 'app-user-form',
  styleUrl: './user-form.scss',
  templateUrl: './user-form.html',
})
export class UserForm {
  private readonly drawerRef = inject<DrawerRef<UserForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<UserFormData | null>(DRAWER_DATA, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dropdowns = inject(DropdownService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notification = inject(NotificationService);
  private readonly userService = inject(UserService);

  readonly mode = signal<UserFormMode>(this.data?.mode ?? 'add');
  readonly id = signal<number | undefined>(this.data?.id);
  /** The loaded user; `null` while adding or loading. */
  readonly record = signal<User | null>(null);

  readonly heading = computed(() => HEADINGS[this.mode()]);
  readonly title = computed(() => this.heading().title);
  readonly readonly = computed(() => this.mode() === 'view');
  readonly canEdit = computed(() => this.auth.hasOperation('EditUser'));

  readonly pictureTypes = PICTURE_TYPES;
  readonly pictureMaxMb = PICTURE_MAX_MB;
  readonly genders = GENDERS.map(name => ({ name }));

  readonly loading = signal(false);
  readonly saving = signal(false);
  /** The picture picked to upload; empty keeps the current one. */
  readonly picture = signal<UploadFile[]>([]);
  readonly picturePreview = computed(() => this.picture()[0]?.url ?? null);

  readonly form = this.fb.group({
    full_name: this.fb.control('', Validators.required),
    username: this.fb.control('', Validators.required),
    // l-email-input checks the format itself.
    email: this.fb.control('', Validators.required),
    // Validators depend on the mode; see the constructor.
    password: this.fb.control(''),
    gender: this.fb.control<string | null>(null),
    contact: this.fb.control(''),
    role_id: this.fb.control<number | null>(null, Validators.required),
    remarks: this.fb.control(''),
    is_active: this.fb.control(true),
  });

  readonly fullName = toSignal(this.form.controls.full_name.valueChanges, { initialValue: '' });
  readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });

  private readonly roles = toSignal(
    this.dropdowns.roles().pipe(
      catchError((error: unknown) => {
        this.notification.error('Could not load roles', apiErrorMessage(error));
        return of([]);
      }),
    ),
    { initialValue: [] },
  );
  /** Active roles plus the loaded user's own, which the list may no longer hold. */
  readonly roleOptions = computed(() => {
    const record = this.record();
    return withMissing(
      this.roles(),
      record?.role_id ? [{ id: record.role_id, name: record.role_name ?? '' }] : [],
    );
  });

  /** Viewing or editing the signed-in user's own account. */
  readonly self: boolean;

  constructor() {
    const id = this.id();
    if (this.mode() !== 'add' && id) {
      this.load(id);
    } else {
      this.mode.set('add');
    }

    // A new user needs a password; on edit a blank one keeps the current password, and the
    // pattern skips blank values.
    const password = this.form.controls.password;
    password.setValidators(
      this.mode() === 'add' ? [Validators.required, Validators.pattern(STRONG_PASSWORD)] : Validators.pattern(STRONG_PASSWORD),
    );
    password.updateValueAndValidity();

    this.self = this.mode() !== 'add' && id === this.auth.user()?.id;
    if (this.self) {
      this.form.controls.role_id.disable();
      this.form.controls.is_active.disable();
    }
  }

  startEdit() {
    this.mode.set('edit');
  }

  onPictureRejected({ reason }: { reason: RejectReason }) {
    this.notification.warn('Picture not added', REJECT_MESSAGES[reason] ?? 'Pick a single picture.');
  }

  save() {
    if (this.saving() || this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warn('Missing details', 'Fill in the fields highlighted in red.');
      return;
    }

    // Locked fields are disabled, so read them with getRawValue. The role is required above.
    const value = this.form.getRawValue();
    const payload: UserPayload = {
      username: value.username.trim(),
      full_name: value.full_name.trim(),
      email: value.email.trim(),
      password: value.password,
      gender: value.gender,
      contact: value.contact.trim() || null,
      remarks: value.remarks.trim() || null,
      is_active: value.is_active,
      role_id: value.role_id!,
    };
    const image = this.picture()[0]?.file;

    const id = this.id();
    const editing = this.mode() === 'edit' && id !== undefined;
    const request = editing ? this.userService.update(id, payload, image) : this.userService.create(payload, image);

    this.saving.set(true);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success(editing ? 'User updated' : 'User added', response.message);
          this.drawerRef?.close(true);
          if (this.self) this.afterSavingSelf(payload.username);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  close() {
    this.drawerRef?.close(false);
  }

  private load(id: number) {
    this.loading.set(true);
    this.userService
      .get(id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: user => this.fill(user),
        error: (error: unknown) => {
          this.notification.error('Could not load the user', apiErrorMessage(error));
          this.close();
        },
      });
  }

  private fill(user: User) {
    this.record.set(user);
    this.form.patchValue({
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      gender: user.gender,
      contact: user.contact ?? '',
      role_id: user.role_id,
      remarks: user.remarks ?? '',
      is_active: user.is_active,
    });
    this.form.markAsPristine();
  }

  /** Keeps the header in step with your own account, or logs you out after a new username. */
  private afterSavingSelf(username: string) {
    if (username !== this.record()?.username) {
      this.notification.info('Username changed', `Log in again as "${username}".`);
      this.auth.logout();
      return;
    }
    // A failure only leaves the header showing the old name or picture until the next reload.
    this.auth.refreshUser().subscribe({ error: () => {} });
  }
}
