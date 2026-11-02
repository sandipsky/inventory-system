import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  Button,
  CalendarSystem,
  Chip,
  ConfirmDialog,
  ConfirmDialogData,
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
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { DateText } from '../../../../shared/components/date-text/date-text';
import { LIST_PAGE_CARD } from '../../../../shared/components/list-page-card/list-page-card';
import { ListParams } from '../../../../shared/models/api.model';
import { AmountPipe } from '../../../../shared/pipes/amount.pipe';
import { DocNoPipe } from '../../../../shared/pipes/doc-no.pipe';
import { FileDownloads } from '../../../../shared/services/file-downloads';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { startOfToday, toIsoDate } from '../../../../shared/utils/date';
import { FileFormat } from '../../../../shared/utils/file';
import { round2 } from '../../../../shared/utils/invoice';
import { PurchaseReturnService } from '../../purchase-return.service';
import { PurchaseFormData, PurchaseFormMode, PurchaseReturn } from '../../purchase.model';
import { PurchaseReturnForm } from '../purchase-return-form/purchase-return-form';

/** Table column key → backend sort field (entity names, see backend/endpoints.md). */
const SORT_FIELDS: Record<string, string> = {
  system_entry_no: 'systemEntryNo',
  date: 'date',
  vendor_name: 'vendor.name',
  bill_no: 'billNo',
  ref_purchase_no: 'refPurchase.systemEntryNo',
  transaction_type: 'transactionType',
  tax: 'totalTax',
  grand_total: 'grandTotal',
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
  providers: [FileDownloads],
  selector: 'app-purchase-return-list',
  styleUrl: '../../../../shared/styles/document-list.scss',
  templateUrl: './purchase-return-list.html',
})
export class PurchaseReturnList {
  private readonly auth = inject(AuthService);
  private readonly drawer = inject(DrawerService);
  private readonly modal = inject(ModalService);
  private readonly notification = inject(NotificationService);
  private readonly returnService = inject(PurchaseReturnService);
  readonly downloads = inject(FileDownloads);

  readonly canCreate = computed(() => this.auth.hasOperation('CreatePurchaseReturn'));
  readonly canEdit = computed(() => this.auth.hasOperation('EditPurchaseReturn'));
  readonly canDelete = computed(() => this.auth.hasOperation('DeletePurchaseReturn'));

  // Field keys are the backend's camelCase filter names (see backend/endpoints.md).
  readonly filterColumns: FilterColumn[] = [
    { name: 'Bill No', formcontrolName: 'billNo', type: 'text' },
    { name: 'Return No', formcontrolName: 'systemEntryNo', type: 'text' },
    { name: 'Ref. Purchase', formcontrolName: 'refPurchase.systemEntryNo', type: 'text' },
    {
      name: 'Transaction Type',
      formcontrolName: 'transactionType',
      type: 'select',
      data: [
        { id: 'Cash', name: 'Cash' },
        { id: 'Credit', name: 'Credit' },
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
    { key: 'vendor_name', header: 'Vendor Name', sortable: true },
    { key: 'bill_no', header: 'Bill Number', sortable: true },
    { key: 'ref_purchase_no', header: 'Ref. Purchase', sortable: true },
    { key: 'transaction_type', header: 'Transaction Type', sortable: true },
    { key: 'sub_total', header: 'Gross/Discount Amt.' },
    { key: 'tax', header: 'Tax Amt.', sortable: true, align: 'right' },
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

  readonly rows = signal<PurchaseReturn[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  /** Bumped to refetch the current page, e.g. after a save or delete. */
  private readonly refresh = signal(0);

  readonly emptyText = computed(() => this.loadError() || 'No purchase returns found for these filters.');

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
              of({ page: null, error: apiErrorMessage(error, 'Could not load purchase returns.') }),
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
  discountOf(row: PurchaseReturn): number {
    return Math.max(round2(row.sub_total - row.taxable_amount - row.non_taxable_amount), 0);
  }

  /** Opens the purchase return form in a near full-screen bottom drawer. `id` is required for edit and view. */
  openForm(mode: PurchaseFormMode, id?: number) {
    const ref = this.drawer.open<PurchaseReturnForm, PurchaseFormData, boolean>(PurchaseReturnForm, {
      data: { mode, id, calendar: this.calendar() },
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

  remove(row: PurchaseReturn) {
    const number = new DocNoPipe().transform(row.system_entry_no);
    this.modal
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        width: '420px',
        data: {
          title: 'Delete purchase return?',
          message: `${number} to ${row.vendor_name} will be deleted and its goods put back into stock. This cannot be undone.`,
          confirmText: 'Delete',
          confirmVariant: 'danger',
          onConfirm: () =>
            this.returnService.delete(row.id).pipe(
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
        this.notification.success('Purchase return deleted', `${number} was deleted.`);
        // Step back when the last row of a page goes, so the pager isn't left on an empty page.
        if (this.rows().length === 1 && this.pageIndex() > 0) this.pageIndex.update(i => i - 1);
        else this.reload();
      });
  }

  reload() {
    this.refresh.update(n => n + 1);
  }

  /** Print (PDF) or Export (Excel): every purchase return the filters match, not only this page. */
  download(format: FileFormat) {
    this.downloads.run(
      format,
      this.returnService.exportList(format, { ...this.query(), calendar: this.calendar() }),
    );
  }
}
