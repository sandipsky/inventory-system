import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Button,
  CalendarSystem,
  Card,
  Chip,
  DRAWER_DATA,
  DateInput,
  DrawerRef,
  Icon,
  IconName,
  NotificationService,
  Skeleton,
  Textarea,
} from '@lumen-ui/angular';
import { catchError, finalize, map, of } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { DropdownItem } from '../../../../shared/models/api.model';
import { DocNoPipe } from '../../../../shared/pipes/doc-no.pipe';
import { DropdownService } from '../../../../shared/services/dropdown.service';
import { FileDownloads } from '../../../../shared/services/file-downloads';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { fromIsoDate, startOfToday, toIsoDate } from '../../../../shared/utils/date';
import { FileFormat } from '../../../../shared/utils/file';
import { withMissing } from '../../../../shared/utils/options';
import {
  JournalLineForm,
  createJournalLine,
  journalLinesProblem,
  journalTotals,
  toJournalLines,
} from '../journal-lines';
import { JournalLinesTable } from '../journal-lines-table/journal-lines-table';
import { Journal, JournalFormData, JournalFormMode, JournalPayload } from '../journal.model';
import { JournalService } from '../journal.service';

const HEADINGS: Record<JournalFormMode, { title: string; subtitle: string; icon: IconName }> = {
  add: {
    title: 'Add Journal Entry',
    subtitle: 'Debit and credit accounts for an entry that is not a purchase, sale or payment',
    icon: 'add',
  },
  edit: {
    title: 'Edit Journal Entry',
    subtitle: 'Update the details of this journal entry',
    icon: 'edit',
  },
  view: {
    title: 'Journal Entry',
    subtitle: 'Details of this journal entry',
    icon: 'eye',
  },
};

/**
 * Manual journal entry form, opened in a near full-screen bottom drawer from the list in one
 * of three modes (see JournalFormData). The drawer ref and data are optional so the component
 * also renders inline (e.g. in tests), defaulting to `add`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Button,
    Card,
    Chip,
    DateInput,
    DocNoPipe,
    Icon,
    JournalLinesTable,
    ReactiveFormsModule,
    Skeleton,
    Textarea,
  ],
  providers: [FileDownloads],
  selector: 'app-journal-form',
  styleUrls: ['../../../../shared/styles/document-form.scss', './journal-form.scss'],
  templateUrl: './journal-form.html',
})
export class JournalForm {
  private readonly drawerRef = inject<DrawerRef<JournalForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<JournalFormData | null>(DRAWER_DATA, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dropdowns = inject(DropdownService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly journalService = inject(JournalService);
  readonly downloads = inject(FileDownloads);
  private readonly notification = inject(NotificationService);

  readonly mode = signal<JournalFormMode>(this.data?.mode ?? 'add');
  readonly id = signal<number | undefined>(this.data?.id);
  readonly calendar: CalendarSystem = this.data?.calendar ?? 'bs';

  readonly heading = computed(() => HEADINGS[this.mode()]);
  readonly readonly = computed(() => this.mode() === 'view');
  readonly canEdit = computed(() => this.auth.hasOperation('EditJournalEntry'));

  readonly loading = signal(false);
  readonly saving = signal(false);
  /** `system_entry_no` of the loaded journal, or a preview of the next one when adding. */
  readonly entryNo = signal<string | null>(null);

  readonly form = this.fb.group({
    date: this.fb.control<Date | null>(startOfToday(), Validators.required),
    remarks: this.fb.control(''),
    lines: this.fb.array<JournalLineForm>([]),
  });

  /** The line groups as a signal, so the table re-renders when a line is added or removed. */
  readonly lines = signal<JournalLineForm[]>([]);

  private readonly accountList = toSignal(
    this.dropdowns.accounts().pipe(
      catchError((error: unknown) => {
        this.notification.error('Could not load accounts', apiErrorMessage(error));
        return of([]);
      }),
    ),
    { initialValue: [] },
  );
  /** Accounts of a loaded journal, which the active-only dropdown may no longer list. */
  private readonly savedAccounts = signal<DropdownItem[]>([]);
  readonly accountOptions = computed(() => withMissing(this.accountList(), this.savedAccounts()));

  private readonly value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });
  readonly totals = computed(() => journalTotals(this.value().lines));

  constructor() {
    const id = this.id();
    if (this.mode() !== 'add' && id) {
      this.load(id);
    } else {
      this.mode.set('add');
      // A journal debits one account and credits another at the least.
      this.addLine();
      this.addLine();
      this.journalService
        .nextNumber()
        .pipe(catchError(() => of(null)), takeUntilDestroyed())
        .subscribe(number => this.entryNo.set(number));
    }
  }

  addLine() {
    const line = createJournalLine(this.fb);
    this.form.controls.lines.push(line);
    this.lines.update(lines => [...lines, line]);
  }

  removeLine(line: JournalLineForm) {
    const index = this.form.controls.lines.controls.indexOf(line);
    if (index < 0) return;
    this.form.controls.lines.removeAt(index);
    this.lines.update(lines => lines.filter(item => item !== line));
  }

  startEdit() {
    this.mode.set('edit');
  }

  save() {
    if (this.saving() || this.loading()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warn('Missing details', 'Fill in the fields highlighted in red.');
      return;
    }
    const value = this.form.getRawValue();
    const problem = journalLinesProblem(value.lines);
    if (problem) {
      this.notification.warn(problem.title, problem.message);
      return;
    }

    const remarks = value.remarks.trim() || null;
    const payload: JournalPayload = {
      date: toIsoDate(value.date!),
      remarks,
      journalEntries: toJournalLines(value.lines, remarks),
    };

    const id = this.id();
    const editing = this.mode() === 'edit' && id !== undefined;
    const request = editing ? this.journalService.update(id, payload) : this.journalService.create(payload);

    this.saving.set(true);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success(editing ? 'Journal updated' : 'Journal added', response.message);
          this.drawerRef?.close(true);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  close() {
    this.drawerRef?.close(false);
  }

  /** Print (PDF) or Export (Excel) this journal; offered in view mode only. */
  download(format: FileFormat) {
    this.downloads.run(
      format,
      this.journalService.exportOne(this.id()!, format, { calendar: this.calendar }),
    );
  }

  private load(id: number) {
    this.loading.set(true);
    this.journalService
      .get(id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: journal => this.fill(journal),
        error: (error: unknown) => {
          this.notification.error('Could not load the journal', apiErrorMessage(error));
          this.close();
        },
      });
  }

  private fill(journal: Journal) {
    const saved = journal.journalEntries ?? [];
    this.entryNo.set(journal.system_entry_no);
    this.savedAccounts.set(
      saved.map(line => ({ id: line.account_master_id, name: line.account_master_name ?? '' })),
    );

    const lines = saved.map(line => createJournalLine(this.fb, line));
    const array = this.form.controls.lines;
    array.clear({ emitEvent: false });
    lines.forEach(line => array.push(line, { emitEvent: false }));
    this.lines.set(lines);

    this.form.patchValue({
      date: fromIsoDate(journal.date),
      remarks: journal.remarks ?? '',
    });
    this.form.markAsPristine();
  }
}
