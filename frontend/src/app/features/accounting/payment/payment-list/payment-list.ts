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
  Select,
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
import { PaymentForm } from '../payment-form/payment-form';
import {
  PARTY_TYPES,
  PartyType,
  Payment,
  PaymentFormData,
  PaymentFormMode,
  VIEW_PAYMENT_OPERATIONS,
} from '../payment.model';
import { PaymentService } from '../payment.service';

/** Table column key → backend sort field (entity names, see backend/endpoints.md). */
const SORT_FIELDS: Record<string, string> = {
  system_entry_no: 'systemEntryNo',
  date: 'date',
  type: 'type',
  payment_mode_name: 'paymentMode.accountName',
  amount: 'amount',
  unadjusted_amount: 'unadjustedAmount',
};

/**
 * Vendor and customer payments in one list; the party type dropdown narrows it to one kind.
 * A role that can view only one kind (`ViewVendorPayment` / `ViewCustomerPayment`) sees and
 * records only that kind, without the dropdown.
 */
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
    Select,
    Table,
    TableCellDirective,
  ],
  providers: [FileDownloads],
  selector: 'app-payment-list',
  styleUrls: ['../../../../shared/styles/document-list.scss', './payment-list.scss'],
  templateUrl: './payment-list.html',
})
export class PaymentList {
  private readonly auth = inject(AuthService);
  private readonly drawer = inject(DrawerService);
  private readonly modal = inject(ModalService);
  private readonly notification = inject(NotificationService);
  private readonly paymentService = inject(PaymentService);
  readonly downloads = inject(FileDownloads);

  readonly canCreate = computed(() => this.auth.hasOperation('CreatePayment'));
  readonly canEdit = computed(() => this.auth.hasOperation('EditPayment'));
  readonly canDelete = computed(() => this.auth.hasOperation('DeletePayment'));

  /** The party types the user may see; the route lets in anyone with at least one. */
  readonly partyTypes = computed(() =>
    PARTY_TYPES.filter(type => this.auth.hasOperation(VIEW_PAYMENT_OPERATIONS[type.value])),
  );

  // Field keys are the backend's camelCase filter names (see backend/endpoints.md).
  readonly filterColumns: FilterColumn[] = [
    { name: 'Payment No', formcontrolName: 'systemEntryNo', type: 'text' },
    { name: 'Payment Mode', formcontrolName: 'paymentMode.accountName', type: 'text' },
    { name: 'Narration', formcontrolName: 'narration', type: 'text' },
  ];

  readonly calendarOptions: SegmentedOption[] = [
    { label: 'AD', value: 'ad' },
    { label: 'BS', value: 'bs' },
  ];

  readonly columns: TableColumn[] = [
    { key: 'sn', header: 'S.N', width: '56px' },
    { key: 'system_entry_no', header: 'Payment Number', sortable: true },
    { key: 'date', header: 'Date', sortable: true },
    { key: 'type', header: 'Party Type', sortable: true },
    { key: 'party', header: 'Party Name' },
    { key: 'payment_mode_name', header: 'Payment Mode', sortable: true },
    { key: 'amount', header: 'Amount', sortable: true, align: 'right' },
    { key: 'unadjusted_amount', header: 'Unadjusted', sortable: true, align: 'right' },
    { key: 'actions', header: '', width: '56px', align: 'center' },
  ];

  readonly calendar = signal<CalendarSystem>('bs');
  /** The dropdown's pick; `null` lists both kinds. */
  readonly partyType = signal<PartyType | null>(null);
  readonly fromDate = signal<Date | null>(startOfToday());
  readonly toDate = signal<Date | null>(startOfToday());
  readonly filters = signal<FilterChange[]>([]);
  readonly sort = signal<TableSort | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly rows = signal<Payment[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  /** Bumped to refetch the current page, e.g. after a save or delete. */
  private readonly refresh = signal(0);

  readonly emptyText = computed(() => this.loadError() || 'No payments found for these filters.');

  /** The type the list shows: the user's only one, or the dropdown's pick. */
  private readonly type = computed(() => {
    const types = this.partyTypes();
    return types.length === 1 ? types[0].value : this.partyType();
  });

  /** Filters and the date range, without paging; shared by the table and the export. */
  private readonly query = computed(() => {
    const params: ListParams = {};
    for (const filter of this.filters()) {
      params[filter.field] = filter.value;
    }
    const type = this.type();
    if (type) params['type'] = type;
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
          this.paymentService.list(params).pipe(
            map(page => ({ page, error: '' })),
            catchError((error: unknown) =>
              of({ page: null, error: apiErrorMessage(error, 'Could not load payments.') }),
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

  partyName(row: Payment): string {
    return (row.type === 'Vendor' ? row.vendor_name : row.customer_name) ?? '-';
  }

  /** Opens the payment form in a near full-screen bottom drawer. `id` is required for edit and view. */
  openForm(mode: PaymentFormMode, id?: number) {
    const ref = this.drawer.open<PaymentForm, PaymentFormData, boolean>(PaymentForm, {
      data: { mode, id, partyTypes: this.partyTypes().map(type => type.value), calendar: this.calendar() },
      position: 'bottom',
      size: 'calc(100vh - 48px)',
      panelClass: 'drawer-sheet',
      // Only the form's own buttons close it, so a stray backdrop click never throws away edits.
      disableClose: true,
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) this.reload();
    });
  }

  remove(row: Payment) {
    const number = new DocNoPipe().transform(row.system_entry_no);
    this.modal
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        width: '420px',
        data: {
          title: 'Delete payment?',
          message: `${number} from ${this.partyName(row)} will be deleted, and the invoices it settled become due again. This cannot be undone.`,
          confirmText: 'Delete',
          confirmVariant: 'danger',
          onConfirm: () =>
            this.paymentService.delete(row.id).pipe(
              tap({
                error: (error: unknown) => this.notification.error('Could not delete', apiErrorMessage(error)),
              }),
            ),
        },
      })
      .afterClosed()
      .subscribe(deleted => {
        if (!deleted) return;
        this.notification.success('Payment deleted', `${number} was deleted.`);
        // Step back when the last row of a page goes, so the pager isn't left on an empty page.
        if (this.rows().length === 1 && this.pageIndex() > 0) this.pageIndex.update(i => i - 1);
        else this.reload();
      });
  }

  reload() {
    this.refresh.update(n => n + 1);
  }

  /** Print (PDF) or Export (Excel): every payment the filters match, not only this page. */
  download(format: FileFormat) {
    this.downloads.run(
      format,
      this.paymentService.exportList(format, { ...this.query(), calendar: this.calendar() }),
    );
  }
}
