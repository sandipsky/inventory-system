import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Card } from '@lumen-ui/angular';
import { AmountPipe } from '../../pipes/amount.pipe';

export interface SummaryItem {
  label: string;
  value: number;
  /** The bottom line, in bold like a document's Net Amount. */
  net?: boolean;
  /** Shows the figure in red, e.g. more settled than paid. */
  error?: boolean;
}

/**
 * A titled card of read-only totals, laid out like the document forms' summary
 * (InvoiceSummaryCard) for forms with no discount to edit, e.g. payments.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountPipe, Card],
  selector: 'app-summary-card',
  styleUrl: '../../styles/summary-card.scss',
  template: `
    <l-card class="card" padding="md" [class.readonly]="readonly()">
      <h3 class="title">{{ title() }}</h3>
      <div class="fields">
        @for (item of items(); track item.label) {
          <div class="field" [class.net]="item.net" [class.error]="item.error">
            <span class="label">{{ item.label }}</span>
            <div class="value">{{ item.value | amount }}</div>
          </div>
        }
      </div>
    </l-card>
  `,
})
export class SummaryCard {
  readonly title = input('Summary');
  readonly items = input.required<readonly SummaryItem[]>();
  /** View mode: values as plain text. */
  readonly readonly = input(false);
}
