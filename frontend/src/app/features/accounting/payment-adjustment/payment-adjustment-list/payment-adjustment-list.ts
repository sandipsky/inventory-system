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
import { toIsoDate } from '../../../../shared/utils/date';
import { FileFormat } from '../../../../shared/utils/file';
import { PARTY_TYPES, PartyType, Payment, PaymentAdjustmentFormData } from '../../payment/payment.model';
import { PaymentService } from '../../payment/payment.service';
import { PaymentAdjustmentForm } from '../payment-adjustment-form/payment-adjustment-form';

/** Table column key → backend sort field (entity names, see backend/endpoints.md). */
const SORT_FIELDS: Record<string, string> = {
  system_entry_no: 'systemEntryNo',
  date: 'date',
  type: 'type',
  amount: 'amount',
  total_adjusted_paid_amount: 'totalAdjustedPaidAmount',
  unadjusted_amount: 'unadjustedAmount',
};

/**
 * Payments with money not yet settled against an invoice (advances, or payments made before the
 * invoice). Adjust opens PaymentAdjustmentForm to settle the party's invoices with it.
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
    Pagination,
    SegmentedControl,
    Select,
    Table,
    TableCellDirective,
  ],
  providers: [FileDownloads],
  selector: 'app-payment-adjustment-list',
  styleUrls: ['../../../../shared/styles/document-list.scss', './payment-adjustment-list.scss'],
  templateUrl: './payment-adjustment-list.html',
})
export class PaymentAdjustmentList {
  private readonly auth = inject(AuthService);
  private readonly drawer = inject(DrawerService);
  private readonly notification = inject(NotificationService);
  readonly downloads = inject(FileDownloads);
  private readonly paymentService = inject(PaymentService);

  readonly canAdjust = computed(() => this.auth.hasOperation('CreatePaymentAdjustment'));

  readonly partyTypes = PARTY_TYPES;

  // Field keys are the backend's camelCase filter names (see backend/endpoints.md).
  readonly filterColumns: FilterColumn[] = [
    { name: 'Payment No', formcontrolName: 'systemEntryNo', type: 'text' },
    { name: 'Payment Mode', formcontrolName: 'paymentMode.accountName', type: 'text' },
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
    { key: 'amount', header: 'Amount', sortable: true, align: 'right' },
    { key: 'total_adjusted_paid_amount', header: 'Settled', sortable: true, align: 'right' },
    { key: 'unadjusted_amount', header: 'Unadjusted', sortable: true, align: 'right' },
    { key: 'actions', header: '', width: '110px', align: 'center' },
  ];

  readonly calendar = signal<CalendarSystem>('bs');
  /** The dropdown's pick; `null` lists both kinds. */
  readonly partyType = signal<PartyType | null>(null);
  // Money left over from any day can still be adjusted, so the range starts open.
  readonly fromDate = signal<Date | null>(null);
  readonly toDate = signal<Date | null>(null);
  readonly filters = signal<FilterChange[]>([]);
  readonly sort = signal<TableSort | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly rows = signal<Payment[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  /** Bumped to refetch the current page, e.g. after an adjustment. */
  private readonly refresh = signal(0);

  readonly emptyText = computed(() => this.loadError() || 'No payments with an unadjusted amount.');

  /** Filters and the date range, without paging; shared by the table and the export. */
  private readonly query = computed(() => {
    const params: ListParams = {};
    for (const filter of this.filters()) {
      params[filter.field] = filter.value;
    }
    const type = this.partyType();
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
          this.paymentService.unadjusted(params).pipe(
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

  /** Opens the adjustment in a near full-screen bottom drawer. */
  adjust(payment: Payment) {
    const ref = this.drawer.open<PaymentAdjustmentForm, PaymentAdjustmentFormData, boolean>(PaymentAdjustmentForm, {
      data: { payment, calendar: this.calendar() },
      position: 'bottom',
      size: 'calc(100vh - 48px)',
      panelClass: 'drawer-sheet',
      // Only the form's own buttons close it, so a stray backdrop click never throws away amounts.
      disableClose: true,
    });
    ref.afterClosed().subscribe(saved => {
      if (!saved) return;
      // A fully adjusted payment leaves the list; step back if it was the last row of a page.
      if (this.rows().length === 1 && this.pageIndex() > 0) this.pageIndex.update(i => i - 1);
      else this.reload();
    });
  }

  reload() {
    this.refresh.update(n => n + 1);
  }

  /** Print (PDF) or Export (Excel): every payment still to adjust the filters match, not only this page. */
  download(format: FileFormat) {
    this.downloads.run(
      format,
      this.paymentService.exportUnadjusted(format, { ...this.query(), calendar: this.calendar() }),
    );
  }
}
