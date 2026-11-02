import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  Button,
  CalendarSystem,
  DateInput,
  Icon,
  SegmentedControl,
  Select,
  Table,
  TableCellDirective,
  TableColumn,
} from '@lumen-ui/angular';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { DateText } from '../../../shared/components/date-text/date-text';
import { LIST_PAGE_CARD } from '../../../shared/components/list-page-card/list-page-card';
import { DropdownItem } from '../../../shared/models/api.model';
import { AmountPipe } from '../../../shared/pipes/amount.pipe';
import { DocNoPipe } from '../../../shared/pipes/doc-no.pipe';
import { DropdownService } from '../../../shared/services/dropdown.service';
import { FileDownloads } from '../../../shared/services/file-downloads';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { fromIsoDate, startOfToday } from '../../../shared/utils/date';
import { FileFormat } from '../../../shared/utils/file';
import { Ledger, LedgerRow } from '../report.model';
import { ReportService } from '../report.service';
import { CALENDAR_OPTIONS, balanceSide, reportRange, startOfMonth } from '../report-table';

/** A table row: the opening balance, one ledger line, or the totals with the closing balance. */
interface LedgerTableRow extends Partial<LedgerRow> {
  kind: 'opening' | 'line' | 'total';
  balance: number;
}

/**
 * One account's ledger (`GET /reports/accounting/ledger/{id}`): its balance before the period, each
 * line with the running balance, then the totals and closing balance. `?account=`, `?fromDate=` and
 * `?toDate=` open it on an account and period, as the trial balance links it.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AmountPipe,
    Button,
    DateInput,
    DateText,
    DocNoPipe,
    FormsModule,
    Icon,
    LIST_PAGE_CARD,
    SegmentedControl,
    Select,
    Table,
    TableCellDirective,
  ],
  providers: [FileDownloads],
  selector: 'app-ledger-report',
  styleUrls: ['../../../shared/styles/document-list.scss', '../report.scss', './ledger-report.scss'],
  templateUrl: './ledger-report.html',
})
export class LedgerReport {
  private readonly reportService = inject(ReportService);
  readonly downloads = inject(FileDownloads);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  readonly calendarOptions = CALENDAR_OPTIONS;
  readonly balanceSide = balanceSide;
  readonly abs = Math.abs;
  readonly docNo = new DocNoPipe();

  readonly columns: TableColumn[] = [
    { key: 'sn', header: 'S.N', width: '56px' },
    { key: 'date', header: 'Date' },
    { key: 'system_entry_no', header: 'Entry No' },
    { key: 'narration', header: 'Narration' },
    { key: 'debit_amount', header: 'Debit', align: 'right' },
    { key: 'credit_amount', header: 'Credit', align: 'right' },
    { key: 'balance', header: 'Balance', align: 'right' },
  ];

  /** Inactive accounts too: their past entries still matter. */
  readonly accounts = toSignal(
    inject(DropdownService)
      .accounts('all', 'all', 'all')
      .pipe(catchError(() => of<DropdownItem[]>([]))),
    { initialValue: [] },
  );

  // A link brings its own dates, where a missing one means no limit; otherwise this month so far.
  private readonly linked = this.query.has('account');

  readonly calendar = signal<CalendarSystem>('bs');
  readonly accountId = signal<number | null>(Number(this.query.get('account')) || null);
  readonly fromDate = signal<Date | null>(this.linked ? fromIsoDate(this.query.get('fromDate')) : startOfMonth());
  readonly toDate = signal<Date | null>(this.linked ? fromIsoDate(this.query.get('toDate')) : startOfToday());

  readonly ledger = signal<Ledger | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal('');

  readonly tableRows = computed<LedgerTableRow[]>(() => {
    const ledger = this.ledger();
    if (!ledger) return [];
    return [
      { kind: 'opening', narration: 'Opening Balance', balance: ledger.opening_balance },
      ...ledger.rows.map(row => ({ ...row, kind: 'line' as const })),
      {
        kind: 'total',
        narration: 'Total',
        debit_amount: ledger.total_debit,
        credit_amount: ledger.total_credit,
        balance: ledger.closing_balance,
      },
    ];
  });

  readonly emptyText = computed(() => this.loadError() || 'Pick an account to see its ledger.');

  private readonly range = computed(() => reportRange('period', this.fromDate(), this.toDate()));

  constructor() {
    const request = computed(() => ({ accountId: this.accountId(), range: this.range() }));

    toObservable(request)
      .pipe(
        tap(({ accountId }) => this.loading.set(accountId !== null)),
        switchMap(({ accountId, range }) => {
          if (accountId === null) return of({ ledger: null, error: '' });
          return this.reportService.ledger(accountId, range).pipe(
            map(ledger => ({ ledger, error: '' })),
            catchError((error: unknown) =>
              of({ ledger: null, error: apiErrorMessage(error, 'Could not load the ledger.') }),
            ),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ ledger, error }) => {
        this.loading.set(false);
        this.loadError.set(error);
        this.ledger.set(ledger);
      });
  }

  /** Two-digit running number of the lines; the opening balance row comes first. */
  serial(index: number): string {
    return String(index).padStart(2, '0');
  }

  /** Print (PDF) or Export (Excel) the ledger of the picked account over the same dates. */
  download(format: FileFormat) {
    const accountId = this.accountId();
    if (accountId === null) return;
    this.downloads.run(
      format,
      this.reportService.exportLedger(accountId, format, { ...this.range(), calendar: this.calendar() }),
    );
  }
}
