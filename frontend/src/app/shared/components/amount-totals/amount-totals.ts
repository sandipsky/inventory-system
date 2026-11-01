import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AmountPipe } from '../../pipes/amount.pipe';

export interface AmountTotal {
  label: string;
  value: number;
  /** Shows the figure in red, e.g. a journal that doesn't balance. */
  error?: boolean;
}

/** A right-aligned row of labelled totals under a table, e.g. a journal's debit and credit totals. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountPipe],
  selector: 'app-amount-totals',
  styleUrl: './amount-totals.scss',
  template: `
    <dl class="totals" [class.view]="readonly()">
      @for (item of items(); track item.label) {
        <div class="total" [class.error]="item.error">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value | amount }}</dd>
        </div>
      }
    </dl>
  `,
})
export class AmountTotals {
  readonly items = input.required<readonly AmountTotal[]>();
  /** View mode: plain text, like Lumen's view-mode fields. */
  readonly readonly = input(false);
}
