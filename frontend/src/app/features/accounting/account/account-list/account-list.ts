import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  Button,
  Chip,
  ChipVariant,
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
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { LIST_PAGE_CARD } from '../../../../shared/components/list-page-card/list-page-card';
import { ListParams } from '../../../../shared/models/api.model';
import { DropdownService } from '../../../../shared/services/dropdown.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { Account, AccountFormData, AccountOwner } from '../account.model';
import { AccountService } from '../account.service';
import { AccountForm } from '../account-form/account-form';

/** Table column key → backend sort field (entity names, see backend/endpoints.md). */
const SORT_FIELDS: Record<string, string> = {
  account_name: 'accountName',
  account_type: 'accountType',
  parent_account_name: 'parentAccountName',
  is_active: 'isActive',
};

const OWNER_CHIPS: Record<AccountOwner, { label: string; variant: ChipVariant }> = {
  system: { label: 'System', variant: 'info' },
  vendor: { label: 'Vendor', variant: 'premium' },
  customer: { label: 'Customer', variant: 'primary' },
};

/**
 * The chart of accounts. Add and edit open AccountForm in a right drawer. System, vendor and
 * customer accounts are tagged, and only accounts the user created can be deleted here.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Chip, Filter, Icon, LIST_PAGE_CARD, Menu, Pagination, Table, TableCellDirective],
  selector: 'app-account-list',
  styleUrl: './account-list.scss',
  templateUrl: './account-list.html',
})
export class AccountList {
  private readonly accountService = inject(AccountService);
  private readonly auth = inject(AuthService);
  private readonly drawer = inject(DrawerService);
  private readonly dropdowns = inject(DropdownService);
  private readonly modal = inject(ModalService);
  private readonly notification = inject(NotificationService);

  readonly canCreate = computed(() => this.auth.hasOperation('CreateAccountMaster'));
  readonly canEdit = computed(() => this.auth.hasOperation('EditAccountMaster'));
  readonly canDelete = computed(() => this.auth.hasOperation('DeleteAccountMaster'));

  private readonly typeGroups = toSignal(quiet(this.accountService.types()), { initialValue: [] });
  private readonly vendorAccountIds = toSignal(
    quiet(this.dropdowns.accounts('party', 'vendor', 'all')).pipe(map(items => new Set(items.map(item => item.id)))),
    { initialValue: new Set<number>() },
  );
  private readonly customerAccountIds = toSignal(
    quiet(this.dropdowns.accounts('party', 'customer', 'all')).pipe(map(items => new Set(items.map(item => item.id)))),
    { initialValue: new Set<number>() },
  );

  /** Account type → its heading (Assets, Liability, …). */
  private readonly headings = computed(
    () => new Map(this.typeGroups().flatMap(group => group.types.map(type => [type, group.heading] as const))),
  );

  // Field keys are the backend's camelCase filter names. Filters match by "contains", so a
  // type also matches longer names holding it (Payables → Other Payables), and booleans,
  // stored as 1/0, send those.
  readonly filterColumns = computed<FilterColumn[]>(() => [
    { name: 'Account Code', formcontrolName: 'accountCode', type: 'text' },
    {
      name: 'Account Type',
      formcontrolName: 'accountType',
      type: 'select',
      groupBy: 'heading',
      data: this.typeGroups().flatMap(group =>
        group.types.map(type => ({ id: type, name: type, heading: group.heading })),
      ),
    },
    { name: 'Parent Account', formcontrolName: 'parentAccountName', type: 'text' },
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

  readonly columns = computed<TableColumn[]>(() => [
    { key: 'sn', header: 'S.N', width: '56px' },
    { key: 'account_name', header: 'Account Name/Code', sortable: true },
    { key: 'account_type', header: 'Account Type', sortable: true },
    { key: 'parent_account_name', header: 'Parent Account', sortable: true },
    { key: 'is_active', header: 'Status', sortable: true, width: '120px' },
    ...(this.canEdit() || this.canDelete()
      ? [{ key: 'actions', header: '', width: '56px', align: 'center' } as const]
      : []),
  ]);

  readonly filters = signal<FilterChange[]>([]);
  readonly sort = signal<TableSort | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly rows = signal<Account[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  /** Bumped to refetch the current page, e.g. after a save or delete. */
  private readonly refresh = signal(0);

  readonly emptyText = computed(() => this.loadError() || 'No accounts found for these filters.');

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
          this.accountService.list(params).pipe(
            map(page => ({ page, error: '' })),
            catchError((error: unknown) =>
              of({ page: null, error: apiErrorMessage(error, 'Could not load accounts.') }),
            ),
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

  headingOf(row: Account): string {
    return this.headings().get(row.account_type) ?? '';
  }

  ownerOf(row: Account): AccountOwner | undefined {
    if (row.is_system_generated) return 'system';
    if (this.vendorAccountIds().has(row.id)) return 'vendor';
    if (this.customerAccountIds().has(row.id)) return 'customer';
    return undefined;
  }

  ownerChip(row: Account) {
    const owner = this.ownerOf(row);
    return owner ? OWNER_CHIPS[owner] : null;
  }

  /** Vendor and customer accounts are deletable by the API, but their party still needs them. */
  canDeleteRow(row: Account): boolean {
    return this.canDelete() && row.deletable && !this.ownerOf(row);
  }

  /** Opens the form in a right drawer: adds an account, or edits `record`. */
  openForm(record?: Account) {
    const ref = this.drawer.open<AccountForm, AccountFormData, boolean>(AccountForm, {
      data: { record, owner: record ? this.ownerOf(record) : undefined },
      position: 'right',
      size: '400px',
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) this.reload();
    });
  }

  remove(row: Account) {
    this.modal
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        width: '420px',
        data: {
          title: 'Delete account?',
          message: `Account "${row.account_name}" will be deleted. This cannot be undone.`,
          confirmText: 'Delete',
          confirmVariant: 'danger',
          onConfirm: () =>
            this.accountService.delete(row.id).pipe(
              tap({
                error: (error: unknown) =>
                  this.notification.error('Could not delete', apiErrorMessage(error)),
              }),
            ),
        },
      })
      .afterClosed()
      .subscribe(deleted => {
        if (!deleted) return;
        this.notification.success('Account deleted', `"${row.account_name}" was deleted.`);
        // Step back when the last row of a page goes, so the pager isn't left on an empty page.
        if (this.rows().length === 1 && this.pageIndex() > 0) this.pageIndex.update(i => i - 1);
        else this.reload();
      });
  }

  reload() {
    this.refresh.update(n => n + 1);
  }
}

/** A lookup whose failure only leaves the list without its labels or filter options. */
function quiet<T>(source: Observable<T[]>): Observable<T[]> {
  return source.pipe(catchError(() => of([])));
}
