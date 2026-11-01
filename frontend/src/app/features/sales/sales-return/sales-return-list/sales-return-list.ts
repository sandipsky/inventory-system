import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  Button,
  CalendarSystem,
  Chip,
  DateInput,
  DrawerService,
  Filter,
  FilterChange,
  FilterColumn,
  Icon,
  Menu,
  ModalService,
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
import { CancelDialog, CancelDialogData } from '../../../../shared/components/cancel-dialog/cancel-dialog';
import { DateText } from '../../../../shared/components/date-text/date-text';
import { LIST_PAGE_CARD } from '../../../../shared/components/list-page-card/list-page-card';
import { ListParams } from '../../../../shared/models/api.model';
import { AmountPipe } from '../../../../shared/pipes/amount.pipe';
import { DocNoPipe } from '../../../../shared/pipes/doc-no.pipe';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { downloadCsv } from '../../../../shared/utils/csv';
import { startOfToday, toIsoDate } from '../../../../shared/utils/date';
import { round2 } from '../../../../shared/utils/invoice';
import { SalesFormData, SalesFormMode, SalesReturn } from '../../sales.model';
import { SalesReturnService } from '../../sales-return.service';
import { SalesReturnForm } from '../sales-return-form/sales-return-form';

/** Table column key → backend sort field (entity names, see backend/endpoints.md). */
const SORT_FIELDS: Record<string, string> = {
  system_entry_no: 'systemEntryNo',
  date: 'date',
  customer_name: 'customer.name',
  ref_sales_no: 'refSales.systemEntryNo',
  transaction_type: 'transactionType',
  total_tax: 'totalTax',
  grand_total: 'grandTotal',
  status: 'isCancelled',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AmountPipe,
    Button,
    Chip,
    DateInput,
    DateText,
    DocNoPipe,
    Filter,
    FormsModule,
    Icon,
    LIST_PAGE_CARD,
    Menu,
    Pagination,
    SegmentedControl,
    Table,
    TableCellDirective,
    UpperCasePipe,
  ],
  selector: 'app-sales-return-list',
  styleUrl: '../../../../shared/styles/document-list.scss',
  templateUrl: './sales-return-list.html',
})
export class SalesReturnList {
  private readonly auth = inject(AuthService);
  private readonly drawer = inject(DrawerService);
  private readonly modal = inject(ModalService);
  private readonly notification = inject(NotificationService);
  private readonly returnService = inject(SalesReturnService);

  readonly canCreate = computed(() => this.auth.hasOperation('CreateSalesReturn'));
  readonly canCancel = computed(() => this.auth.hasOperation('CancelSalesReturn'));

  // Field keys are the backend's camelCase filter names (see backend/endpoints.md).
  readonly filterColumns: FilterColumn[] = [
    { name: 'Return No', formcontrolName: 'systemEntryNo', type: 'text' },
    { name: 'Ref. Invoice', formcontrolName: 'refSales.systemEntryNo', type: 'text' },
    {
      name: 'Transaction Type',
      formcontrolName: 'transactionType',
      type: 'select',
      data: [
        { id: 'Cash', name: 'Cash' },
        { id: 'Credit', name: 'Credit' },
      ],
    },
    {
      name: 'Status',
      formcontrolName: 'isCancelled',
      type: 'select',
      // Booleans filter as their stored 0 / 1.
      data: [
        { id: '0', name: 'Active' },
        { id: '1', name: 'Cancelled' },
      ],
    },
  ];

  readonly calendarOptions: SegmentedOption[] = [
    { label: 'AD', value: 'ad' },
    { label: 'BS', value: 'bs' },
  ];

  readonly columns: TableColumn[] = [
    { key: 'sn', header: 'S.N', width: '56px' },
    { key: 'system_entry_no', header: 'Return Number', sortable: true },
    { key: 'date', header: 'Posting Date', sortable: true },
    { key: 'customer_name', header: 'Customer Name', sortable: true },
    { key: 'ref_sales_no', header: 'Ref. Invoice', sortable: true },
    { key: 'transaction_type', header: 'Transaction Type', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'sub_total', header: 'Gross/Discount Amt.' },
    { key: 'total_tax', header: 'Tax Amt.', sortable: true, align: 'right' },
    { key: 'grand_total', header: 'Net Amt.', sortable: true, align: 'right' },
    { key: 'actions', header: '', width: '56px', align: 'center' },
  ];

  readonly calendar = signal<CalendarSystem>('bs');
  readonly fromDate = signal<Date | null>(startOfToday());
  readonly toDate = signal<Date | null>(startOfToday());
  readonly filters = signal<FilterChange[]>([]);
  readonly sort = signal<TableSort | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly rows = signal<SalesReturn[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly exporting = signal(false);
  /** Bumped to refetch the current page, e.g. after a save or cancel. */
  private readonly refresh = signal(0);

  readonly emptyText = computed(() => this.loadError() || 'No sales returns found for these filters.');

  /** Filters and the date range, without paging; shared by the table and the export. */
  private readonly query = computed(() => {
    const params: ListParams = {};
    for (const filter of this.filters()) {
      params[filter.field] = filter.value;
    }
    const from = this.fromDate();
    const to = this.toDate();
    if (from) params['fromDate'] = toIsoDate(from);
    if (to) params['toDate'] = toIsoDate(to);

    const sort = this.sort();
    params['sort'] = sort ? `${SORT_FIELDS[sort.key] ?? sort.key}:${sort.direction}` : 'id:desc';
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
          this.returnService.list(params).pipe(
            map(page => ({ page, error: '' })),
            catchError((error: unknown) =>
              of({ page: null, error: apiErrorMessage(error, 'Could not load sales returns.') }),
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

  /** The API stores the typed discount (a percent or an amount), so the amount is derived. */
  discountOf(row: SalesReturn): number {
    return Math.max(round2(row.sub_total - row.taxable_amount - row.non_taxable_amount), 0);
  }

  /** Opens the sales return form in a near full-screen bottom drawer. `id` is required for view. */
  openForm(mode: SalesFormMode, id?: number) {
    const ref = this.drawer.open<SalesReturnForm, SalesFormData, boolean>(SalesReturnForm, {
      data: { mode, id, calendar: this.calendar() },
      position: 'bottom',
      size: 'calc(100vh - 48px)',
      panelClass: 'drawer-sheet',
      // Only the form's own buttons close it, so a stray backdrop click never throws away a new return.
      disableClose: true,
    });
    ref.afterClosed().subscribe(changed => {
      if (changed) this.reload();
    });
  }

  cancel(row: SalesReturn) {
    const number = new DocNoPipe().transform(row.system_entry_no);
    this.modal
      .open<CancelDialog, CancelDialogData, boolean>(CancelDialog, {
        width: '440px',
        data: {
          title: 'Cancel sales return?',
          message: `${number} from ${row.customer_name} will be cancelled and its goods taken back out of stock. It stays on record as cancelled.`,
          confirmText: 'Cancel Return',
          onConfirm: remarks =>
            this.returnService.cancel(row.id, remarks).pipe(
              tap({
                error: (error: unknown) => this.notification.error('Could not cancel', apiErrorMessage(error)),
              }),
            ),
        },
      })
      .afterClosed()
      .subscribe(done => {
        if (!done) return;
        this.notification.success('Sales return cancelled', `${number} was cancelled.`);
        this.reload();
      });
  }

  reload() {
    this.refresh.update(n => n + 1);
  }

  print() {
    window.print();
  }

  /** Every sales return matching the filters (not just this page) as a CSV file. */
  exportList() {
    if (this.exporting()) return;
    this.exporting.set(true);
    const pageSize = Math.max(this.total(), 1);

    this.returnService
      .list({ ...this.query(), pageIndex: 0, pageSize })
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: page => {
          const docNo = new DocNoPipe();
          downloadCsv(`sales-returns-${toIsoDate(new Date())}`, [
            ['S.N', 'Return Number', 'Posting Date', 'Customer Name', 'Ref. Invoice', 'Transaction Type', 'Status',
              'Gross Amount', 'Discount', 'Tax Amount', 'Net Amount'],
            ...page.content.map((row, i) => [
              i + 1,
              docNo.transform(row.system_entry_no),
              row.date,
              row.customer_name,
              docNo.transform(row.ref_sales_no),
              row.transaction_type,
              row.cancelled ? 'Cancelled' : 'Active',
              row.sub_total,
              this.discountOf(row),
              row.total_tax,
              row.grand_total,
            ]),
          ]);
        },
        error: (error: unknown) => this.notification.error('Export failed', apiErrorMessage(error)),
      });
  }
}
