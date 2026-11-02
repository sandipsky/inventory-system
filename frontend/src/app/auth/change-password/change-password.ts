import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button, Card, Icon, NotificationService, PasswordInput } from '@lumen-ui/angular';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../../shared/utils/api-error';
import { STRONG_PASSWORD } from '../../shared/utils/password';
import { AuthService } from '../auth.service';

/**
 * The signed-in user's own password, opened from the profile menu (`/change-password`). The
 * current password is checked by the API; the new one must pass the checklist, differ from the
 * current one and be typed twice. The session stays signed in afterwards.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Card, Icon, PasswordInput, ReactiveFormsModule],
  selector: 'app-change-password',
  styleUrl: './change-password.scss',
  templateUrl: './change-password.html',
})
export class ChangePassword {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly location = inject(Location);
  private readonly notification = inject(NotificationService);

  readonly form = this.fb.group({
    current_password: this.fb.control('', Validators.required),
    new_password: this.fb.control('', [Validators.required, Validators.pattern(STRONG_PASSWORD)]),
    confirm_password: this.fb.control('', Validators.required),
  });

  readonly saving = signal(false);
  readonly name = computed(() => {
    const user = this.auth.user();
    return user?.fullName || user?.username || '';
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly newPassword = computed(() => this.value().new_password ?? '');

  /** The new password is the one already in use. */
  readonly sameAsCurrent = computed(
    () => !!this.newPassword() && this.newPassword() === this.value().current_password,
  );
  /** The confirmation, once typed, differs from the new password. */
  readonly mismatch = computed(() => {
    const confirm = this.value().confirm_password ?? '';
    return !!confirm && confirm !== this.newPassword();
  });

  save() {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid || this.sameAsCurrent() || this.mismatch()) return;

    const { current_password, new_password } = this.form.getRawValue();
    this.saving.set(true);
    this.auth
      .changePassword({ current_password, new_password })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: response => {
          this.notification.success('Password changed', response.message);
          this.form.reset();
        },
        error: (error: unknown) => this.notification.error('Could not change password', apiErrorMessage(error)),
      });
  }

  cancel() {
    this.location.back();
  }
}
