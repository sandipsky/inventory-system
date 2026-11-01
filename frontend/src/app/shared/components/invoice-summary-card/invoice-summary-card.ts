import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Card, NumberInput, Select } from '@lumen-ui/angular';
import { startWith, switchMap } from 'rxjs';
import { DiscountType, InvoiceSummary } from '../../models/invoice.model';
import { AmountPipe } from '../../pipes/amount.pipe';

/**
 * Totals row of a purchase / sales document. Discount type and value are the
 * document form's own controls; every other figure comes from `summary`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountPipe, Card, NumberInput, ReactiveFormsModule, Select],
  selector: 'app-invoice-summary-card',
  styleUrl: '../../styles/summary-card.scss',
  templateUrl: './invoice-summary-card.html',
})
export class InvoiceSummaryCard {
  readonly summary = input.required<InvoiceSummary>();
  readonly discountType = input.required<FormControl<DiscountType>>();
  readonly discount = input.required<FormControl<number | null>>();
  /** View mode: values as plain text. */
  readonly readonly = input(false);

  readonly discountTypes = [
    { label: 'Percentage', value: 'Percentage' },
    { label: 'Flat', value: 'Flat' },
  ];

  private readonly type = toSignal(
    toObservable(this.discountType).pipe(
      switchMap(control => control.valueChanges.pipe(startWith(control.value))),
    ),
    { initialValue: 'Percentage' as DiscountType },
  );

  readonly percent = computed(() => this.type() === 'Percentage');
}
