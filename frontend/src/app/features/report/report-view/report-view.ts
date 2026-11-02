import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  Button,
  CalendarSystem,
  Chip,
  DateInput,
  Icon,
  SegmentedControl,
  Table,
  TableCellDirective,
  TableColumn,
  TableSort,
  TextInput,
} from '@lumen-ui/angular';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { DateText } from '../../../shared/components/date-text/date-text';
import { LIST_PAGE_CARD } from '../../../shared/components/list-page-card/list-page-card';
import { AmountPipe } from '../../../shared/pipes/amount.pipe';
import { DocNoPipe } from '../../../shared/pipes/doc-no.pipe';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { batchName, isExpired } from '../../../shared/utils/batch';
import { downloadCsv } from '../../../shared/utils/csv';
import { startOfToday } from '../../../shared/utils/date';
import { LEDGER_REPORT, REPORTS, ReportColumn, ReportConfig, ReportRow } from '../report.model';
import { ReportService } from '../report.service';
import {
  CALENDAR_OPTIONS,
  cellValue,
  columnTotals,
  csvValue,
  isCancelled,
  reportFileName,
  reportRange,
  searchRows,
  sortRows,
  startOfMonth,
} from '../report-table';

/**
 * Page shared by every table report; the route's `data.report` picks the `REPORTS` entry. The API
 * sends the whole report, so search, sorting and the totals row happen here, and Export writes
 * what is on screen.
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
    FormsModule,
    Icon,
    LIST_PAGE_CARD,
    RouterLink,
    SegmentedControl,
    Table,
    TableCellDirective,
    TextInput,
  ],
  selector: 'app-report-view',
  styleUrls: ['../../../shared/styles/document-list.scss', '../report.scss'],
  templateUrl: './report-view.html',
})
export class ReportView {
  private readonly reportService = inject(ReportService);

  readonly config: ReportConfig = REPORTS[inject(ActivatedRoute).snapshot.data['report']];

  readonly calendarOptions = CALENDAR_OPTIONS;
  readonly ledgerPath = `/reports/${LEDGER_REPORT.path}`;
  readonly today = startOfToday();
  readonly batchName = batchName;
  readonly isCancelled = isCancelled;
  readonly isExpired = isExpired;

  // The table only shows the sort; `shownRows` sorts, so the totals row stays last.
  readonly columns: TableColumn[] = [
    { key: 'sn', header: 'S.N', width: '56px' },
    ...this.config.columns.map(
      (column): TableColumn => ({
        key: column.key,
        header: column.header,
        sortable: true,
        width: column.width,
        align: column.format === 'amount' || column.format === 'number' ? 'right' : 'left',
      }),
    ),
  ];

  /** The column that reads "Total" in the totals row: the first one not added up. */
  readonly totalLabelKey = this.config.columns.find(column => !column.total)?.key;
  private readonly hasTotals = this.config.columns.some(column => column.total);

  readonly calendar = signal<CalendarSystem>('bs');
  readonly fromDate = signal<Date | null>(startOfMonth());
  readonly toDate = signal<Date | null>(startOfToday());
  readonly search = signal('');
  readonly sort = signal<TableSort | null>(null);

  readonly rows = signal<ReportRow[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');

  private readonly range = computed(() => reportRange(this.config.range, this.fromDate(), this.toDate()));

  /** The rows on screen: those matching the search, in the table's sort (else the API's order). */
  readonly shownRows = computed(() =>
    sortRows(searchRows(this.rows(), this.config.columns, this.search()), this.config.columns, this.sort()),
  );
  readonly totals = computed(() => columnTotals(this.shownRows(), this.config.columns));
  readonly cancelledCount = computed(() => this.shownRows().filter(isCancelled).length);

  /** The rows, then the totals row when the report adds anything up. */
  readonly tableRows = computed(() => {
    const rows = this.shownRows();
    return this.hasTotals && rows.length ? [...rows, this.totals()] : rows;
  });

  readonly emptyText = computed(() => {
    if (this.loadError()) return this.loadError();
    return this.rows().length ? 'No rows match the search.' : this.config.emptyText;
  });

  constructor() {
    toObservable(this.range)
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(range =>
          this.reportService.rows(this.config.path, range).pipe(
            map(rows => ({ rows, error: '' })),
            catchError((error: unknown) =>
              of({ rows: [], error: apiErrorMessage(error, `Could not load the ${this.config.title.toLowerCase()}.`) }),
            ),
          ),
        ),
        takeUntilDestroyed(),
      )
      // Rows stay on screen while the next dates load, so the table doesn't flash empty.
      .subscribe(({ rows, error }) => {
        this.loading.set(false);
        this.loadError.set(error);
        this.rows.set(rows);
      });
  }

  cell(row: ReportRow, column: ReportColumn): unknown {
    return cellValue(row, column);
  }

  isTotal(row: ReportRow): boolean {
    return row === this.totals();
  }

  /** Two-digit running number: 01, 02, … */
  serial(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  /** The account's ledger over the same dates, so its closing balance is the one shown here. */
  ledgerParams(row: ReportRow): Record<string, string | number> {
    return { account: row['account_id'], ...this.range() };
  }

  print() {
    window.print();
  }

  /** The rows on screen, in their order, with the totals row. */
  exportCsv() {
    const columns = this.config.columns;
    const totals = this.totals();
    downloadCsv(reportFileName(this.config.title), [
      ['S.N', ...columns.map(column => column.header)],
      ...this.shownRows().map((row, i) => [i + 1, ...columns.map(column => csvValue(row, column))]),
      ...(this.hasTotals && this.shownRows().length
        ? [['', ...columns.map(column => (column.total ? totals[column.key] : column.key === this.totalLabelKey ? 'Total' : null))]]
        : []),
    ]);
  }
}
