import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
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
import { AuthService } from '../../../auth/auth.service';
import { LIST_PAGE_CARD } from '../../../shared/components/list-page-card/list-page-card';
import { ListParams } from '../../../shared/models/api.model';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { MASTERS, MasterFormData, MasterKind, MasterRecord } from '../masters.model';
import { MastersService } from '../masters.service';
import { MasterForm } from '../master-form/master-form';

/** Table column key → backend sort field (entity names, see backend/endpoints.md). */
const SORT_FIELDS: Record<string, string> = {
  tax_rate: 'taxRate',
  is_active: 'isActive',
};

/**
 * List page shared by units, categories, packings and tax types; the route's `data.master`
 * picks which. Add and edit open MasterForm in a narrow right drawer.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Chip, Filter, Icon, LIST_PAGE_CARD, Menu, Pagination, Table, TableCellDirective],
  selector: 'app-master-list',
  styleUrl: './master-list.scss',
  templateUrl: './master-list.html',
})
export class MasterList {
  private readonly auth = inject(AuthService);
  private readonly drawer = inject(DrawerService);
  private readonly modal = inject(ModalService);
  private readonly notification = inject(NotificationService);
  private readonly mastersService = inject(MastersService);

  readonly kind: MasterKind = inject(ActivatedRoute).snapshot.data['master'];
  readonly config = MASTERS[this.kind];

  readonly canCreate = computed(() => this.auth.hasOperation(`Create${this.config.operation}`));
  readonly canEdit = computed(() => this.auth.hasOperation(`Edit${this.config.operation}`));
  readonly canDelete = computed(() => this.auth.hasOperation(`Delete${this.config.operation}`));

  // The API stores booleans as 1/0 and filters by "contains", so the status filter sends those.
  readonly filterColumns: FilterColumn[] = [
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

  readonly columns = computed<TableColumn[]>(() => [
    { key: 'sn', header: 'S.N', width: '56px' },
    { key: 'name', header: 'Name', sortable: true },
    ...(this.config.hasRate
      ? [{ key: 'tax_rate', header: 'Tax Rate', sortable: true, align: 'right', width: '140px' } as const]
      : []),
    { key: 'is_active', header: 'Status', sortable: true, width: '140px' },
    ...(this.canEdit() || this.canDelete()
      ? [{ key: 'actions', header: '', width: '56px', align: 'center' } as const]
      : []),
  ]);

  readonly filters = signal<FilterChange[]>([]);
  readonly sort = signal<TableSort | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly rows = signal<MasterRecord[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  /** Bumped to refetch the current page, e.g. after a save or delete. */
  private readonly refresh = signal(0);

  readonly emptyText = computed(
    () => this.loadError() || `No ${this.config.plural.toLowerCase()} found for these filters.`,
  );

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
          this.mastersService.list(this.kind, params).pipe(
            map(page => ({ page, error: '' })),
            catchError((error: unknown) =>
              of({
                page: null,
                error: apiErrorMessage(error, `Could not load ${this.config.plural.toLowerCase()}.`),
              }),
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

  /** Opens the form in a narrow right drawer: adds a record, or edits `record`. */
  openForm(record?: MasterRecord) {
    const ref = this.drawer.open<MasterForm, MasterFormData, boolean>(MasterForm, {
      data: { kind: this.kind, record },
      position: 'right',
      size: '350px',
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) this.reload();
    });
  }

  remove(row: MasterRecord) {
    const singular = this.config.singular;
    this.modal
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        width: '420px',
        data: {
          title: `Delete ${singular.toLowerCase()}?`,
          message: `${singular} "${row.name}" will be deleted. This cannot be undone.`,
          confirmText: 'Delete',
          confirmVariant: 'danger',
          onConfirm: () =>
            this.mastersService.delete(this.kind, row.id).pipe(
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
        this.notification.success(`${singular} deleted`, `"${row.name}" was deleted.`);
        // Step back when the last row of a page goes, so the pager isn't left on an empty page.
        if (this.rows().length === 1 && this.pageIndex() > 0) this.pageIndex.update(i => i - 1);
        else this.reload();
      });
  }

  reload() {
    this.refresh.update(n => n + 1);
  }
}
