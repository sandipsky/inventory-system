import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  Button,
  Chip,
  ConfirmDialog,
  ConfirmDialogData,
  DrawerService,
  Filter,
  FilterChange,
  FilterColumn,
  Icon,
  Menu,
  ModalService,
  NotificationService,
  Pagination,
  Table,
  TableCellDirective,
  TableColumn,
  TableSort,
} from '@lumen-ui/angular';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { LIST_PAGE_CARD } from '../../../../shared/components/list-page-card/list-page-card';
import { UserAvatar } from '../../../../shared/components/user-avatar/user-avatar';
import { ListParams } from '../../../../shared/models/api.model';
import { DropdownService } from '../../../../shared/services/dropdown.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { User, UserFormData, UserFormMode } from '../user.model';
import { UserService } from '../user.service';
import { UserForm } from '../user-form/user-form';

/** Table column key → backend sort field (entity names, see backend/endpoints.md). */
const SORT_FIELDS: Record<string, string> = {
  full_name: 'fullName',
  role_name: 'role.name',
  is_active: 'isActive',
};

/**
 * The users who can log in. Add, edit and view open UserForm in a bottom drawer. The signed-in
 * user can't delete their own account here.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Chip, Filter, Icon, LIST_PAGE_CARD, Menu, Pagination, Table, TableCellDirective, UserAvatar],
  selector: 'app-user-list',
  styleUrl: './user-list.scss',
  templateUrl: './user-list.html',
})
export class UserList {
  private readonly auth = inject(AuthService);
  private readonly drawer = inject(DrawerService);
  private readonly dropdowns = inject(DropdownService);
  private readonly modal = inject(ModalService);
  private readonly notification = inject(NotificationService);
  private readonly userService = inject(UserService);

  readonly canCreate = computed(() => this.auth.hasOperation('CreateUser'));
  readonly canEdit = computed(() => this.auth.hasOperation('EditUser'));
  readonly canDelete = computed(() => this.auth.hasOperation('DeleteUser'));

  private readonly roles = toSignal(this.dropdowns.roles('all').pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  // Field keys are the backend's camelCase filter names. A role filters by name, which
  // matches by "contains"; booleans, stored as 1/0, send those.
  readonly filterColumns = computed<FilterColumn[]>(() => [
    { name: 'Username', formcontrolName: 'username', type: 'text' },
    { name: 'Email', formcontrolName: 'email', type: 'text' },
    {
      name: 'Role',
      formcontrolName: 'role.name',
      type: 'select',
      data: this.roles().map(role => ({ id: role.name, name: role.name })),
    },
    {
      name: 'Status',
      formcontrolName: 'isActive',
      type: 'select',
      data: [
        { id: '1', name: 'Active' },
        { id: '0', name: 'Inactive' },
      ],
    },
  ]);

  readonly columns: TableColumn[] = [
    { key: 'sn', header: 'S.N', width: '56px' },
    { key: 'full_name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'contact', header: 'Contact', sortable: true },
    { key: 'role_name', header: 'Role', sortable: true },
    { key: 'is_active', header: 'Status', sortable: true, width: '120px' },
    { key: 'actions', header: '', width: '56px', align: 'center' },
  ];

  readonly filters = signal<FilterChange[]>([]);
  readonly sort = signal<TableSort | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly rows = signal<User[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  /** Bumped to refetch the current page, e.g. after a save or delete. */
  private readonly refresh = signal(0);

  readonly emptyText = computed(() => this.loadError() || 'No users found for these filters.');

  constructor() {
    const request = computed(() => {
      const params: ListParams = { pageIndex: this.pageIndex(), pageSize: this.pageSize() };
      for (const filter of this.filters()) {
        params[filter.field] = filter.value;
      }
      const sort = this.sort();
      params['sort'] = sort ? `${SORT_FIELDS[sort.key] ?? sort.key}:${sort.direction}` : 'id:desc';
      return { params, refresh: this.refresh() };
    });

    toObservable(request)
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(({ params }) =>
          this.userService.list(params).pipe(
            map(page => ({ page, error: '' })),
            catchError((error: unknown) => of({ page: null, error: apiErrorMessage(error, 'Could not load users.') })),
          ),
        ),
        takeUntilDestroyed(),
      )
      // Rows stay on screen while the next page loads, so the table doesn't flash empty.
      .subscribe(({ page, error }) => {
        this.loading.set(false);
        this.loadError.set(error);
        this.rows.set(page?.content ?? []);
        this.total.set(page?.totalElements ?? 0);
      });
  }

  onFilterChange(filters: FilterChange[]) {
    this.filters.set(filters);
    this.pageIndex.set(0);
  }

  resetPage() {
    this.pageIndex.set(0);
  }

  /** Two-digit running number across pages: 01, 02, … */
  serial(index: number): string {
    return String(this.pageIndex() * this.pageSize() + index + 1).padStart(2, '0');
  }

  isSelf(row: User): boolean {
    return row.id === this.auth.user()?.id;
  }

  canDeleteRow(row: User): boolean {
    return this.canDelete() && !this.isSelf(row);
  }

  /** Opens the user form in a near full-screen bottom drawer. `id` is required for edit and view. */
  openForm(mode: UserFormMode, id?: number) {
    const ref = this.drawer.open<UserForm, UserFormData, boolean>(UserForm, {
      data: { mode, id },
      position: 'bottom',
      size: 'calc(100vh - 48px)',
      panelClass: 'drawer-sheet',
      // Only the form's own buttons close it, so a stray backdrop click never throws away edits
      // (view mode can switch to edit in place).
      disableClose: true,
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) this.reload();
    });
  }

  remove(row: User) {
    this.modal
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        width: '420px',
        data: {
          title: 'Delete user?',
          message: `User "${row.full_name}" (${row.username}) will be deleted and can no longer log in. This cannot be undone.`,
          confirmText: 'Delete',
          confirmVariant: 'danger',
          onConfirm: () =>
            this.userService.delete(row.id).pipe(
              tap({
                error: (error: unknown) => this.notification.error('Could not delete', apiErrorMessage(error)),
              }),
            ),
        },
      })
      .afterClosed()
      .subscribe(deleted => {
        if (!deleted) return;
        this.notification.success('User deleted', `"${row.full_name}" was deleted.`);
        // Step back when the last row of a page goes, so the pager isn't left on an empty page.
        if (this.rows().length === 1 && this.pageIndex() > 0) this.pageIndex.update(i => i - 1);
        else this.reload();
      });
  }

  reload() {
    this.refresh.update(n => n + 1);
  }
}
