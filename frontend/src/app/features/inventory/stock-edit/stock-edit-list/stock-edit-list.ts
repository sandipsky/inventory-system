import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  Button,
  CalendarSystem,
  DrawerService,
  Filter,
  FilterChange,
  FilterColumn,
  Icon,
  NotificationService,
  Pagination,
  SegmentedControl,
  SegmentedOption,
  Table,
  TableCellDirective,
  TableColumn,
  TableSort,
} from '@lumen-ui/angular';
import { catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { DateText } from '../../../../shared/components/date-text/date-text';
import { LIST_PAGE_CARD } from '../../../../shared/components/list-page-card/list-page-card';
import { ListParams } from '../../../../shared/models/api.model';
import { AmountPipe } from '../../../../shared/pipes/amount.pipe';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { batchName, isExpired } from '../../../../shared/utils/batch';
import { downloadCsv } from '../../../../shared/utils/csv';
import { toIsoDate } from '../../../../shared/utils/date';
import { StockBatch, StockEditFormData } from '../../inventory.model';
import { StockEditService } from '../../stock-edit.service';
import { StockEditForm } from '../stock-edit-form/stock-edit-form';

/** Table column key → backend sort field (entity names, see backend/endpoints.md). */
const SORT_FIELDS: Record<string, string> = {
  product_name: 'product.name',
  batch_no: 'batchNo',
  expiry_date: 'expiryDate',
  quantity: 'quantity',
  cost_price: 'costPrice',
  selling_price: 'sellingPrice',
  mrp: 'mrp',
};

/** Every product batch with its stock, by product name. Edit opens StockEditForm in a right drawer. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AmountPipe,
    Button,
    DateText,
    Filter,
    FormsModule,
    Icon,
    LIST_PAGE_CARD,
    Pagination,
    SegmentedControl,
    Table,
    TableCellDirective,
  ],
  selector: 'app-stock-edit-list',
  styleUrls: ['../../../../shared/styles/document-list.scss', './stock-edit-list.scss'],
  templateUrl: './stock-edit-list.html',
})
export class StockEditList {
  private readonly auth = inject(AuthService);
  private readonly drawer = inject(DrawerService);
  private readonly notification = inject(NotificationService);
  private readonly stockService = inject(StockEditService);

  readonly canEdit = computed(() => this.auth.hasOperation('EditStockEdit'));

  // Field keys are the backend's camelCase filter names (see backend/endpoints.md).
  readonly filterColumns: FilterColumn[] = [{ name: 'Batch No', formcontrolName: 'batchNo', type: 'text' }];

  readonly calendarOptions: SegmentedOption[] = [
    { label: 'AD', value: 'ad' },
    { label: 'BS', value: 'bs' },
  ];

  readonly columns = computed<TableColumn[]>(() => [
    { key: 'sn', header: 'S.N', width: '56px' },
    { key: 'product_name', header: 'Product', sortable: true },
    { key: 'batch_no', header: 'Batch', sortable: true },
    { key: 'expiry_date', header: 'Expiry Date', sortable: true },
    { key: 'quantity', header: 'In Stock', sortable: true, align: 'right' },
    { key: 'cost_price', header: 'Cost Price', sortable: true, align: 'right' },
    { key: 'selling_price', header: 'Selling Price', sortable: true, align: 'right' },
    { key: 'mrp', header: 'MRP', sortable: true, align: 'right' },
    ...(this.canEdit() ? [{ key: 'actions', header: '', width: '96px', align: 'center' } as const] : []),
  ]);

  readonly calendar = signal<CalendarSystem>('bs');
  readonly filters = signal<FilterChange[]>([]);
  readonly sort = signal<TableSort | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly rows = signal<StockBatch[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly exporting = signal(false);
  /** Bumped to refetch the current page, e.g. after a save. */
  private readonly refresh = signal(0);

  readonly emptyText = computed(() => this.loadError() || 'No stock found for these filters.');

  readonly batchName = batchName;
  readonly isExpired = isExpired;

  /** Filters and sort, without paging; shared by the table and the export. */
  private readonly query = computed(() => {
    const params: ListParams = {};
    for (const filter of this.filters()) {
      params[filter.field] = filter.value;
    }
    const sort = this.sort();
    // A product's batches stay together, in the order they were added.
    params['sort'] = sort ? `${SORT_FIELDS[sort.key] ?? sort.key}:${sort.direction}` : 'product.name:asc,id:asc';
    return params;
  });

  constructor() {
    const request = computed(() => ({
      params: { ...this.query(), pageIndex: this.pageIndex(), pageSize: this.pageSize() },
      refresh: this.refresh(),
    }));

    toObservable(request)
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(({ params }) =>
          this.stockService.list(params).pipe(
            map(page => ({ page, error: '' })),
            catchError((error: unknown) => of({ page: null, error: apiErrorMessage(error, 'Could not load stock.') })),
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

  /** Opens the batch in a right drawer to overwrite its figures. */
  openForm(batch: StockBatch) {
    const ref = this.drawer.open<StockEditForm, StockEditFormData, boolean>(StockEditForm, {
      data: { batch, calendar: this.calendar() },
      position: 'right',
      size: '400px',
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) this.reload();
    });
  }

  reload() {
    this.refresh.update(n => n + 1);
  }

  print() {
    window.print();
  }

  /** Every batch matching the filters (not just this page) as a CSV file. */
  exportList() {
    if (this.exporting()) return;
    this.exporting.set(true);
    const pageSize = Math.max(this.total(), 1);

    this.stockService
      .list({ ...this.query(), pageIndex: 0, pageSize })
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: page => {
          downloadCsv(`stock-${toIsoDate(new Date())}`, [
            ['S.N', 'Product', 'Batch', 'Expiry Date', 'In Stock', 'Cost Price', 'Selling Price', 'MRP'],
            ...page.content.map((row, i) => [
              i + 1,
              row.product_name,
              batchName(row.batch_no),
              row.expiry_date,
              row.quantity,
              row.cost_price,
              row.selling_price,
              row.mrp,
            ]),
          ]);
        },
        error: (error: unknown) => this.notification.error('Export failed', apiErrorMessage(error)),
      });
  }
}
