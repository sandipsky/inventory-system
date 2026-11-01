import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Button,
  Card,
  Checkbox,
  DRAWER_DATA,
  DrawerRef,
  Icon,
  IconName,
  NotificationService,
  Skeleton,
  TextInput,
  Textarea,
  Toggle,
} from '@lumen-ui/angular';
import { catchError, finalize, map, of } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { PERMISSION_ACTIONS, toPermissionGroups } from '../permissions';
import { Role, RoleFormData, RoleFormMode, RolePayload } from '../role.model';
import { RoleService } from '../role.service';

const HEADINGS: Record<RoleFormMode, { title: string; subtitle: string; icon: IconName }> = {
  add: { title: 'Add Role', subtitle: 'Name the role and pick what it allows', icon: 'add' },
  edit: { title: 'Edit Role', subtitle: 'Update this role and what it allows', icon: 'edit' },
  view: { title: 'Role', subtitle: 'What this role allows', icon: 'eye' },
};

/**
 * Role form, opened in a near full-screen bottom drawer from RoleList in one of three modes
 * (see RoleFormData): its details and a matrix of the operations it grants. Edit and view load
 * the role by id; the matrix itself comes from the list of every operation. Closes with `true`
 * once saved.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Card, Checkbox, FormsModule, Icon, ReactiveFormsModule, Skeleton, TextInput, Textarea, Toggle],
  selector: 'app-role-form',
  styleUrl: './role-form.scss',
  templateUrl: './role-form.html',
})
export class RoleForm {
  private readonly drawerRef = inject<DrawerRef<RoleForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<RoleFormData | null>(DRAWER_DATA, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notification = inject(NotificationService);
  private readonly roleService = inject(RoleService);

  readonly mode = signal<RoleFormMode>(this.data?.mode ?? 'add');
  readonly id = signal<number | undefined>(this.data?.id);

  readonly heading = computed(() => HEADINGS[this.mode()]);
  readonly title = computed(() => this.heading().title);
  readonly readonly = computed(() => this.mode() === 'view');
  readonly canEdit = computed(() => this.auth.hasOperation('EditRole'));

  readonly actions = PERMISSION_ACTIONS;
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    name: this.fb.control('', Validators.required),
    description: this.fb.control(''),
    is_active: this.fb.control(true),
  });

  /** Ids of the operations the role grants. */
  readonly selected = signal(new Set<number>());

  /** `undefined` until the operations load. */
  private readonly loaded = toSignal(
    this.roleService.operations().pipe(
      map(toPermissionGroups),
      catchError((error: unknown) => {
        this.notification.error('Could not load permissions', apiErrorMessage(error));
        return of([]);
      }),
    ),
  );
  readonly loadingGroups = computed(() => this.loaded() === undefined);
  readonly groups = computed(() => this.loaded() ?? []);
  readonly allIds = computed(() => this.groups().flatMap(group => group.ids));

  /** Viewing or editing the signed-in user's own role: what it loses, they lose. */
  readonly own: boolean;

  constructor() {
    const id = this.id();
    if (this.mode() !== 'add' && id) {
      this.load(id);
    } else {
      this.mode.set('add');
    }
    this.own = this.mode() !== 'add' && id === this.auth.user()?.roleId;
  }

  has(id: number): boolean {
    return this.selected().has(id);
  }

  allOf(ids: number[]): boolean {
    return ids.length > 0 && ids.every(id => this.selected().has(id));
  }

  countOf(ids: number[]): number {
    return ids.filter(id => this.selected().has(id)).length;
  }

  /** Grants (`on`) or removes every operation in `ids`. */
  setAll(ids: number[], on: boolean) {
    this.selected.update(current => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
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
    const payload: RolePayload = {
      name: value.name.trim(),
      description: value.description.trim() || null,
      is_active: value.is_active,
      operation_ids: [...this.selected()].sort((a, b) => a - b),
    };

    const id = this.id();
    const editing = this.mode() === 'edit' && id !== undefined;
    const request = editing ? this.roleService.update(id, payload) : this.roleService.create(payload);

    this.saving.set(true);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success(editing ? 'Role updated' : 'Role added', response.message);
          this.drawerRef?.close(true);
          // The menus and buttons follow the new permissions. A failure only leaves them stale
          // until the next reload; the API already checks the new ones.
          if (this.own) this.auth.refreshUser().subscribe({ error: () => {} });
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  close() {
    this.drawerRef?.close(false);
  }

  private load(id: number) {
    this.loading.set(true);
    this.roleService
      .get(id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: role => this.fill(role),
        error: (error: unknown) => {
          this.notification.error('Could not load the role', apiErrorMessage(error));
          this.close();
        },
      });
  }

  private fill(role: Role) {
    this.form.patchValue({
      name: role.name,
      description: role.description ?? '',
      is_active: role.is_active,
    });
    this.form.markAsPristine();
    this.selected.set(new Set(role.operation_ids));
  }
}
