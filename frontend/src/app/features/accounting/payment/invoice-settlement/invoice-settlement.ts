import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CalendarSystem, NumberInput, Table, TableCellDirective, TableColumn } from '@lumen-ui/angular';
import { DateText } from '../../../../shared/components/date-text/date-text';
import { AmountPipe } from '../../../../shared/pipes/amount.pipe';
import { DocNoPipe } from '../../../../shared/pipes/doc-no.pipe';
import { SettlementRow } from '../settlement';

/**
 * A party's invoices with what a payment settles of each. In view mode the amount due
 * (which has moved on since) is left out.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountPipe, DateText, DocNoPipe, NumberInput, ReactiveFormsModule, Table, TableCellDirective],
  selector: 'app-invoice-settlement',
  styleUrl: './invoice-settlement.scss',
  templateUrl: './invoice-settlement.html',
})
export class InvoiceSettlement {
  readonly rows = input.required<readonly SettlementRow[]>();
  readonly readonly = input(false);
  readonly loading = input(false);
  readonly emptyText = input('No invoices due.');
  /** Header of the amount column, e.g. `Paid`. */
  readonly amountHeader = input('Paid');
  readonly calendar = input<CalendarSystem>('bs');

  readonly columns = computed<TableColumn[]>(() => {
    const columns: TableColumn[] = [
      { key: 'sn', header: 'S.N', width: '48px' },
      { key: 'invoice_date', header: 'Invoice Date' },
      { key: 'invoice_number', header: 'Invoice Number' },
      { key: 'total_invoice_amount', header: 'Invoice Amount', align: 'right' },
    ];
    if (!this.readonly()) columns.push({ key: 'due_amount', header: 'Amount Due', align: 'right' });
    columns.push({ key: 'paid', header: this.amountHeader(), width: '170px', align: 'right' });
    return columns;
  });

  readonly trackRow = (row: SettlementRow) => row.invoice_number;

  serial(index: number): string {
    return String(index + 1).padStart(2, '0');
  }
}
