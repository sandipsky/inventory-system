import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl } from '@angular/forms';
import {
  Button,
  CalendarSystem,
  Card,
  Chip,
  DRAWER_DATA,
  DrawerRef,
  Icon,
  NotificationService,
} from '@lumen-ui/angular';
import { catchError, finalize, of } from 'rxjs';
import { DateText } from '../../../../shared/components/date-text/date-text';
import { SummaryCard, SummaryItem } from '../../../../shared/components/summary-card/summary-card';
import { AmountPipe } from '../../../../shared/pipes/amount.pipe';
import { DocNoPipe } from '../../../../shared/pipes/doc-no.pipe';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { round2 } from '../../../../shared/utils/invoice';
import { InvoiceSettlement } from '../../payment/invoice-settlement/invoice-settlement';
import { Payment, PaymentAdjustmentFormData } from '../../payment/payment.model';
import { PaymentService } from '../../payment/payment.service';
import { SettlementRow, autoSettle, settledTotal, settlementRows, toPaymentDetails } from '../../payment/settlement';

/**
 * Settles the party's invoices with what a payment left unadjusted, in a bottom drawer opened
 * from the payment adjustment list. Settled amounts can't be taken back here; editing the
 * payment can.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountPipe, Button, Card, Chip, DateText, DocNoPipe, Icon, InvoiceSettlement, SummaryCard],
  selector: 'app-payment-adjustment-form',
  styleUrls: ['../../../../shared/styles/document-form.scss', './payment-adjustment-form.scss'],
  templateUrl: './payment-adjustment-form.html',
})
export class PaymentAdjustmentForm {
  private readonly drawerRef = inject<DrawerRef<PaymentAdjustmentForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<PaymentAdjustmentFormData>(DRAWER_DATA);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notification = inject(NotificationService);
  private readonly paymentService = inject(PaymentService);

  readonly payment: Payment = this.data.payment;
  readonly calendar: CalendarSystem = this.data.calendar ?? 'bs';
  readonly partyName = (this.payment.type === 'Vendor' ? this.payment.vendor_name : this.payment.customer_name) ?? '-';

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly rows = signal<SettlementRow[]>([]);

  /** The rows' amounts, so their validity and changes count together. */
  private readonly amounts = new FormArray<FormControl<number | null>>([]);
  private readonly value = toSignal(this.amounts.valueChanges, { initialValue: [] });

  readonly adjusting = computed(() => {
    this.value();
    return settledTotal(this.rows());
  });

  readonly summary = computed<SummaryItem[]>(() => {
    const available = this.payment.unadjusted_amount;
    const adjusting = this.adjusting();
    return [
      { label: 'Unadjusted Amount', value: available },
      { label: 'Adjusting Now', value: adjusting, error: adjusting > available },
      { label: 'Left Unadjusted', value: round2(available - adjusting), error: adjusting > available, net: true },
    ];
  });

  constructor() {
    const partyId = this.payment.type === 'Vendor' ? this.payment.vendor_id : this.payment.customer_id;
    this.paymentService
      .outstanding(this.payment.type, partyId)
      .pipe(
        catchError((error: unknown) => {
          this.notification.error('Could not load the invoices due', apiErrorMessage(error));
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(),
      )
      .subscribe(invoices => {
        const rows = settlementRows(invoices);
        rows.forEach(row => this.amounts.push(row.paid, { emitEvent: false }));
        this.amounts.updateValueAndValidity();
        this.rows.set(rows);
      });
  }

  /** Settles the invoices oldest first with everything left unadjusted. */
  settleOldestFirst() {
    autoSettle(this.rows(), this.payment.unadjusted_amount);
  }

  save() {
    if (this.saving() || this.loading()) return;

    if (this.amounts.invalid) {
      this.amounts.markAllAsTouched();
      this.notification.warn('Too much settled', 'An invoice cannot be settled for more than is due on it.');
      return;
    }
    const details = toPaymentDetails(this.rows());
    if (!details.length) {
      this.notification.warn('Nothing to adjust', 'Enter the amount to settle on at least one invoice.');
      return;
    }
    if (this.adjusting() > this.payment.unadjusted_amount) {
      this.notification.warn('Too much settled', 'The invoices settled add up to more than the unadjusted amount.');
      return;
    }

    this.saving.set(true);
    this.paymentService
      .adjust(this.payment.id, details)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success('Payment adjusted', response.message);
          this.drawerRef?.close(true);
        },
        error: (error: unknown) => this.notification.error('Could not adjust', apiErrorMessage(error)),
      });
  }

  close() {
    this.drawerRef?.close(false);
  }
}
