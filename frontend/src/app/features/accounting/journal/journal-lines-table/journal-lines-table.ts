import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import {
  Button,
  Icon,
  NumberInput,
  Select,
  Table,
  TableCellDirective,
  TableColumn,
  TextInput,
} from '@lumen-ui/angular';
import { AmountTotal, AmountTotals } from '../../../../shared/components/amount-totals/amount-totals';
import { DropdownItem } from '../../../../shared/models/api.model';
import { AmountPipe } from '../../../../shared/pipes/amount.pipe';
import { JournalLineForm, JournalTotals } from '../journal-lines';

const COLUMNS: TableColumn[] = [
  { key: 'sn', header: 'S.N', width: '48px' },
  { key: 'account', header: 'Account', width: '280px' },
  { key: 'narration', header: 'Narration' },
  { key: 'debit_amount', header: 'Debit', width: '160px', align: 'right' },
  { key: 'credit_amount', header: 'Credit', width: '160px', align: 'right' },
  { key: 'actions', header: '', width: '44px', align: 'center' },
];

/**
 * The account lines of a journal or of the opening balance, with their debit and credit
 * totals. The lines are the parent form's groups; adding them is the parent's job too.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountTotals, Button, Icon, NumberInput, ReactiveFormsModule, Select, Table, TableCellDirective, TextInput],
  selector: 'app-journal-lines-table',
  styleUrl: './journal-lines-table.scss',
  templateUrl: './journal-lines-table.html',
})
export class JournalLinesTable {
  readonly lines = input.required<readonly JournalLineForm[]>();
  readonly accounts = input<readonly DropdownItem[]>([]);
  readonly totals = input.required<JournalTotals>();
  /** View mode: values as plain text, no remove buttons. */
  readonly readonly = input(false);
  readonly remove = output<JournalLineForm>();

  readonly columns = computed(() =>
    this.readonly() ? COLUMNS.filter(column => column.key !== 'actions') : COLUMNS,
  );
  readonly trackLine = (line: JournalLineForm) => line;

  readonly totalItems = computed<AmountTotal[]>(() => {
    const totals = this.totals();
    return [
      { label: 'Total Debit', value: totals.debit },
      { label: 'Total Credit', value: totals.credit },
      { label: 'Difference', value: totals.difference, error: totals.difference !== 0 },
    ];
  });

  private readonly amount = new AmountPipe();

  serial(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  /** A line debits or credits one account, so typing one side clears the other. */
  onDebit(line: JournalLineForm, value: number | null) {
    if (value) line.controls.credit_amount.setValue(null);
  }

  onCredit(line: JournalLineForm, value: number | null) {
    if (value) line.controls.debit_amount.setValue(null);
  }

  /** View mode: the amount grouped like the rest of the app, the unused side as `-`. */
  amountText(value: number | null): string {
    return value ? String(this.amount.transform(value)) : '-';
  }
}
