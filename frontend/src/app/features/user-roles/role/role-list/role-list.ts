import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
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
import { ListParams } from '../../../../shared/models/api.model';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { UserService } from '../../user/user.service';
import { Role, RoleFormData, RoleFormMode } from '../role.model';
import { RoleService } from '../role.service';
import { RoleForm } from '../role-form/role-form';

/** Table column key → backend sort field (entity names, see backend/endpoints.md). */
const SORT_FIELDS: Record<string, string> = {
  is_active: 'isActive',
};

/**
 * Roles and how many permissions each grants. Add, edit and view open RoleForm in a bottom
 * drawer. A role is only deleted once no user has it.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Chip, Filter, Icon, LIST_PAGE_CARD, Menu, Pagination, Table, TableCellDirective],
  selector: 'app-role-list',
  styleUrl: './role-list.scss',
  templateUrl: './role-list.html',
})
export class RoleList {
  private readonly auth = inject(AuthService);
  private readonly drawer = inject(DrawerService);
  private readonly modal = inject(ModalService);
  private readonly notification = inject(NotificationService);
  private readonly roleService = inject(RoleService);
  private readonly userService = inject(UserService);

  readonly canCreate = computed(() => this.auth.hasOperation('CreateRole'));
  readonly canEdit = computed(() => this.auth.hasOperation('EditRole'));
  readonly canDelete = computed(() => this.auth.hasOperation('DeleteRole'));

  // Field keys are the backend's camelCase filter names; booleans, stored as 1/0, send those.
  readonly filterColumns: FilterColumn[] = [
    { name: 'Description', formcontrolName: 'description', type: 'text' },
    {
      name: 'Status',
      formcontrolName: 'isActive',
      type: 'select',
      data: [
        { id: '1', name: 'Active' },
        { id: '0', name: 'Inactive' },
      ],
    },
  ];

  readonly columns: TableColumn[] = [
    { key: 'sn', header: 'S.N', width: '56px' },
    { key: 'name', header: 'Role Name', sortable: true },
    { key: 'description', header: 'Description', sortable: true },
    { key: 'permissions', header: 'Permissions', width: '140px' },
    { key: 'is_active', header: 'Status', sortable: true, width: '120px' },
    { key: 'actions', header: '', width: '56px', align: 'center' },
  ];

  readonly filters = signal<FilterChange[]>([]);
  readonly sort = signal<TableSort | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly rows = signal<Role[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  /** Bumped to refetch the current page, e.g. after a save or delete. */
  private readonly refresh = signal(0);

  readonly emptyText = computed(() => this.loadError() || 'No roles found for these filters.');

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
          this.roleService.list(params).pipe(
            map(page => ({ page, error: '' })),
            catchError((error: unknown) => of({ page: null, error: apiErrorMessage(error, 'Could not load roles.') })),
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

  /** The signed-in user's own role. */
  isOwn(row: Role): boolean {
    return row.id === this.auth.user()?.roleId;
  }

  /** Opens the role form in a near full-screen bottom drawer. `id` is required for edit and view. */
  openForm(mode: RoleFormMode, id?: number) {
    const ref = this.drawer.open<RoleForm, RoleFormData, boolean>(RoleForm, {
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

  /** Asks to delete `row`, unless users still have it. */
  remove(row: Role) {
    this.userService.countWithRole(row).subscribe({
      next: count => {
        if (count === 0) {
          this.confirmRemove(row);
          return;
        }
        const users = count === 1 ? '1 user has' : `${count} users have`;
        this.notification.warn('Role in use', `${users} the "${row.name}" role. Give them another role first.`);
      },
      error: (error: unknown) =>
        this.notification.error('Could not check who has this role', apiErrorMessage(error)),
    });
  }

  reload() {
    this.refresh.update(n => n + 1);
  }

  private confirmRemove(row: Role) {
    this.modal
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        width: '420px',
        data: {
          title: 'Delete role?',
          message: `Role "${row.name}" will be deleted. This cannot be undone.`,
          confirmText: 'Delete',
          confirmVariant: 'danger',
          onConfirm: () =>
            this.roleService.delete(row.id).pipe(
              tap({
                error: (error: unknown) => this.notification.error('Could not delete', apiErrorMessage(error)),
              }),
            ),
        },
      })
      .afterClosed()
      .subscribe(deleted => {
        if (!deleted) return;
        this.notification.success('Role deleted', `"${row.name}" was deleted.`);
        // Step back when the last row of a page goes, so the pager isn't left on an empty page.
        if (this.rows().length === 1 && this.pageIndex() > 0) this.pageIndex.update(i => i - 1);
        else this.reload();
      });
  }
}
