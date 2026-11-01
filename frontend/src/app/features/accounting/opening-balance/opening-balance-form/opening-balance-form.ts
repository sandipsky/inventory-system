import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button, Card, DateInput, Icon, NotificationService, Skeleton, TextInput } from '@lumen-ui/angular';
import { catchError, finalize, map, of } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { DropdownItem } from '../../../../shared/models/api.model';
import { DropdownService } from '../../../../shared/services/dropdown.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { fromIsoDate, startOfToday, toIsoDate } from '../../../../shared/utils/date';
import { withMissing } from '../../../../shared/utils/options';
import {
  JournalLineForm,
  createJournalLine,
  journalLinesProblem,
  journalTotals,
  toJournalLines,
} from '../../journal/journal-lines';
import { JournalLinesTable } from '../../journal/journal-lines-table/journal-lines-table';
import { Journal } from '../../journal/journal.model';
import { OpeningBalanceService } from '../opening-balance.service';

/**
 * The balances the accounts start with, as one journal whose debits equal its credits. It shows
 * read-only; Edit switches to editing in place, and Save replaces the whole opening balance.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Card, DateInput, Icon, JournalLinesTable, ReactiveFormsModule, Skeleton, TextInput],
  selector: 'app-opening-balance-form',
  styleUrl: './opening-balance-form.scss',
  templateUrl: './opening-balance-form.html',
})
export class OpeningBalanceForm {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dropdowns = inject(DropdownService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notification = inject(NotificationService);
  private readonly openingBalanceService = inject(OpeningBalanceService);

  readonly canEdit = computed(() => this.auth.hasOperation('CreateOpeningBalance'));
  readonly editing = signal(false);
  readonly readonly = computed(() => !this.editing());

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal('');

  /** The opening balance as last loaded; `id` 0 until one is saved. */
  private readonly saved = signal<Journal | null>(null);
  readonly isSet = computed(() => !!this.saved()?.id);

  readonly form = this.fb.group({
    date: this.fb.control<Date | null>(null, Validators.required),
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
  /** Accounts of the saved opening balance, which the active-only dropdown may no longer list. */
  private readonly savedAccounts = signal<DropdownItem[]>([]);
  readonly accountOptions = computed(() => withMissing(this.accountList(), this.savedAccounts()));

  private readonly value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });
  readonly totals = computed(() => journalTotals(this.value().lines));

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set('');
    this.openingBalanceService
      .get()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: openingBalance => {
          this.saved.set(openingBalance);
          this.fill(openingBalance);
        },
        error: (error: unknown) => this.loadError.set(apiErrorMessage(error, 'Could not load the opening balance.')),
      });
  }

  startEdit() {
    // A new opening balance starts today, with a debit and a credit line to fill in.
    if (!this.form.controls.date.value) this.form.controls.date.setValue(startOfToday());
    if (!this.lines().length) {
      this.addLine();
      this.addLine();
    }
    this.editing.set(true);
  }

  cancel() {
    const saved = this.saved();
    if (saved) this.fill(saved);
    this.editing.set(false);
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

  save() {
    if (this.saving()) return;

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
    this.saving.set(true);
    this.openingBalanceService
      .save({
        date: toIsoDate(value.date!),
        remarks,
        journalEntries: toJournalLines(value.lines, remarks ?? 'Opening Balance'),
      })
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success('Opening balance saved', response.message);
          this.editing.set(false);
          // Shows it as stored: remarks and narrations filled in, lines with their new ids.
          this.load();
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  private fill(openingBalance: Journal) {
    const saved = openingBalance.journalEntries ?? [];
    this.savedAccounts.set(
      saved.map(line => ({ id: line.account_master_id, name: line.account_master_name ?? '' })),
    );

    const lines = saved.map(line => createJournalLine(this.fb, line));
    const array = this.form.controls.lines;
    array.clear({ emitEvent: false });
    lines.forEach(line => array.push(line, { emitEvent: false }));
    this.lines.set(lines);

    this.form.patchValue({
      date: fromIsoDate(openingBalance.date),
      remarks: openingBalance.remarks ?? '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
