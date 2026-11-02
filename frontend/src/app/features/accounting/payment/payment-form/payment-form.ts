import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Button,
  CalendarSystem,
  Card,
  DRAWER_DATA,
  DateInput,
  DrawerRef,
  Icon,
  IconName,
  NotificationService,
  NumberInput,
  Radio,
  Select,
  Skeleton,
} from '@lumen-ui/angular';
import { Observable, catchError, finalize, map, of, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { SummaryCard, SummaryItem } from '../../../../shared/components/summary-card/summary-card';
import { DropdownItem } from '../../../../shared/models/api.model';
import { AmountPipe } from '../../../../shared/pipes/amount.pipe';
import { DocNoPipe } from '../../../../shared/pipes/doc-no.pipe';
import { DropdownService } from '../../../../shared/services/dropdown.service';
import { FileDownloads } from '../../../../shared/services/file-downloads';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { fromIsoDate, startOfToday, toIsoDate } from '../../../../shared/utils/date';
import { FileFormat } from '../../../../shared/utils/file';
import { round2 } from '../../../../shared/utils/invoice';
import { withMissing } from '../../../../shared/utils/options';
import { InvoiceSettlement } from '../invoice-settlement/invoice-settlement';
import {
  PARTY_TYPES,
  PAYMENT_DIRECTIONS,
  PartyType,
  Payment,
  PaymentFormData,
  PaymentFormMode,
  PaymentPayload,
} from '../payment.model';
import { PaymentService } from '../payment.service';
import { SettlementRow, autoSettle, settledRows, settledTotal, settlementRows, toPaymentDetails } from '../settlement';

const HEADINGS: Record<PaymentFormMode, { title: string; subtitle: string; icon: IconName }> = {
  add: {
    title: 'Add Payment',
    subtitle: 'Please fill the required fields to add payment',
    icon: 'add',
  },
  edit: {
    title: 'Edit Payment',
    subtitle: 'Update the details of this payment',
    icon: 'edit',
  },
  view: {
    title: 'Payment',
    subtitle: 'Details of this payment',
    icon: 'eye',
  },
};

/** The party a payment names: its vendor or its customer. */
function partyOf(payment: Payment): DropdownItem {
  return payment.type === 'Vendor'
    ? { id: payment.vendor_id, name: payment.vendor_name ?? '' }
    : { id: payment.customer_id, name: payment.customer_name ?? '' };
}

/**
 * Payment form, opened in a near full-screen bottom drawer from the list in one of three modes
 * (see PaymentFormData). The party type (or the Payment Type, Send / Receive, which is the same
 * choice) picks whether it pays a vendor or receives from a customer; the party's invoices with
 * money due list below, and what the payment settles of each is typed in or spread oldest
 * first. Whatever it doesn't settle stays unadjusted, for payment adjustment to settle later.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Button,
    Card,
    DateInput,
    DocNoPipe,
    Icon,
    InvoiceSettlement,
    NumberInput,
    Radio,
    ReactiveFormsModule,
    Select,
    Skeleton,
    SummaryCard,
  ],
  providers: [FileDownloads],
  selector: 'app-payment-form',
  styleUrls: ['../../../../shared/styles/document-form.scss', './payment-form.scss'],
  templateUrl: './payment-form.html',
})
export class PaymentForm {
  private readonly drawerRef = inject<DrawerRef<PaymentForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<PaymentFormData | null>(DRAWER_DATA, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dropdowns = inject(DropdownService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notification = inject(NotificationService);
  readonly downloads = inject(FileDownloads);
  private readonly paymentService = inject(PaymentService);

  readonly mode = signal<PaymentFormMode>(this.data?.mode ?? 'add');
  readonly id = signal<number | undefined>(this.data?.id);
  readonly calendar: CalendarSystem = this.data?.calendar ?? 'bs';
  private readonly allowed = (type: PartyType) => !this.data?.partyTypes?.length || this.data.partyTypes.includes(type);
  readonly partyTypes = PARTY_TYPES.filter(type => this.allowed(type.value));
  readonly directions = PAYMENT_DIRECTIONS.filter(direction => this.allowed(direction.value));

  readonly heading = computed(() => HEADINGS[this.mode()]);
  readonly readonly = computed(() => this.mode() === 'view');
  readonly canEdit = computed(() => this.auth.hasOperation('EditPayment'));

  readonly loading = signal(false);
  readonly saving = signal(false);
  /** `system_entry_no` of the loaded payment, or a preview of the next one when adding. */
  readonly entryNo = signal<string | null>(null);

  readonly form = this.fb.group({
    type: this.fb.control<PartyType>(this.partyTypes[0].value, Validators.required),
    party_id: this.fb.control<number | null>(null, Validators.required),
    date: this.fb.control<Date | null>(startOfToday(), Validators.required),
    payment_mode_id: this.fb.control<number | null>(null, Validators.required),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    /** The settlement rows' amounts, so their validity and changes count with the form's. */
    settlement: this.fb.array<FormControl<number | null>>([]),
  });

  /** The loaded payment; its own settlements count as available again while editing it. */
  private readonly saved = signal<Payment | null>(null);
  /** The party type last picked or loaded, so loading a payment doesn't clear its party. */
  private pickedType = this.form.controls.type.value;

  readonly type = toSignal(
    this.form.controls.type.valueChanges.pipe(startWith(this.form.controls.type.value)),
    { initialValue: this.form.controls.type.value },
  );
  private readonly partyId = toSignal(
    this.form.controls.party_id.valueChanges.pipe(startWith(this.form.controls.party_id.value)),
    { initialValue: this.form.controls.party_id.value },
  );

  private readonly vendorList = toSignal(
    this.allowed('Vendor') ? this.dropdown(this.dropdowns.vendors(), 'vendors') : of([]),
    { initialValue: [] },
  );
  private readonly customerList = toSignal(
    this.allowed('Customer') ? this.dropdown(this.dropdowns.customers(), 'customers') : of([]),
    { initialValue: [] },
  );
  private readonly modeList = toSignal(
    this.dropdown(this.dropdowns.paymentModes(), 'transaction types').pipe(tap(modes => this.defaultMode(modes))),
    { initialValue: [] },
  );

  /** The party type's active parties, plus the loaded payment's own party if it is inactive now. */
  readonly partyOptions = computed(() => {
    const type = this.type();
    const saved = this.saved();
    const parties = type === 'Vendor' ? this.vendorList() : this.customerList();
    return withMissing(parties, saved?.type === type ? [partyOf(saved)] : []);
  });
  readonly modeOptions = computed(() => {
    const saved = this.saved();
    return withMissing(
      this.modeList(),
      saved ? [{ id: saved.payment_mode_id, name: saved.payment_mode_name ?? '' }] : [],
    );
  });

  readonly settlementTitle = computed(() =>
    this.type() === 'Vendor' ? 'Payment Send Details' : 'Payment Receive Details',
  );

  readonly rows = signal<SettlementRow[]>([]);
  readonly invoicesLoading = signal(false);

  private readonly value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  readonly settled = computed(() => {
    this.value();
    return settledTotal(this.rows());
  });

  readonly summary = computed<SummaryItem[]>(() => {
    const amount = this.value().amount ?? 0;
    const settled = this.settled();
    return [
      { label: 'Total Adjusted Paid Amount', value: settled, error: settled > amount },
      { label: 'Unadjusted Amount', value: round2(amount - settled), error: settled > amount },
      { label: 'Total Payment Amount', value: amount, net: true },
    ];
  });

  readonly invoicesEmptyText = computed(() => {
    if (this.readonly()) return 'This payment does not settle any invoice yet.';
    return this.partyId()
      ? 'No invoices due. The whole amount stays unadjusted.'
      : 'Pick a party to see their invoices with money due.';
  });

  constructor() {
    this.form.controls.type.valueChanges.pipe(takeUntilDestroyed()).subscribe(type => {
      // The Party Type select and the Payment Type radios share this control, and Angular doesn't
      // pass a pick in one of them on to the other, so write it back to both.
      this.form.controls.type.setValue(type, { emitEvent: false });
      // A vendor and a customer are different lists, so a new party type starts without a party.
      if (type === this.pickedType) return;
      this.pickedType = type;
      this.form.controls.party_id.setValue(null);
    });

    // The party's invoices with money due, merged with what the payment being edited settled.
    // View mode shows only the latter, so switching to edit fetches the invoices.
    toObservable(
      computed(() => ({ type: this.type(), id: this.partyId(), readonly: this.readonly(), saved: this.saved() })),
    )
      .pipe(
        switchMap(({ type, id, readonly, saved }) => {
          const own = saved && saved.type === type && partyOf(saved).id === id ? (saved.paymentDetails ?? []) : [];
          if (readonly) return of(settledRows(own));
          if (!id) return of([]);
          this.invoicesLoading.set(true);
          return this.paymentService.outstanding(type, id).pipe(
            map(invoices => settlementRows(invoices, own)),
            catchError((error: unknown) => {
              this.notification.error('Could not load the invoices due', apiErrorMessage(error));
              return of(settlementRows([], own));
            }),
            finalize(() => this.invoicesLoading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(rows => this.setRows(rows));

    const id = this.id();
    if (this.mode() !== 'add' && id) {
      this.load(id);
    } else {
      this.mode.set('add');
      this.paymentService
        .nextNumber()
        .pipe(catchError(() => of(null)), takeUntilDestroyed())
        .subscribe(number => this.entryNo.set(number));
    }
  }

  /** Settles the invoices oldest first with the payment amount. */
  settleOldestFirst() {
    const amount = this.form.controls.amount.value ?? 0;
    if (amount <= 0) {
      this.notification.warn('No amount', 'Enter the payment amount first.');
      return;
    }
    autoSettle(this.rows(), amount);
  }

  startEdit() {
    this.mode.set('edit');
  }

  save() {
    if (this.saving() || this.loading()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.settlement.invalid) {
        this.notification.warn('Too much settled', 'An invoice cannot be settled for more than is due on it.');
      } else {
        this.notification.warn('Missing details', 'Fill in the fields highlighted in red.');
      }
      return;
    }
    const value = this.form.getRawValue();
    if (this.settled() > value.amount!) {
      this.notification.warn('Too much settled', 'The invoices settled add up to more than the payment amount.');
      return;
    }

    // The form has no narration: the API writes one for the party ("Payment made to …").
    // A saved payment keeps its own while it stays with the same party.
    const saved = this.saved();
    const sameParty = saved?.type === value.type && partyOf(saved).id === value.party_id;

    // Required fields are checked above, so the non-null assertions hold.
    const payload: PaymentPayload = {
      date: toIsoDate(value.date!),
      type: value.type,
      vendor_id: value.type === 'Vendor' ? value.party_id! : 0,
      customer_id: value.type === 'Customer' ? value.party_id! : 0,
      payment_mode_id: value.payment_mode_id!,
      amount: value.amount!,
      narration: sameParty ? (saved?.narration ?? '') : '',
      paymentDetails: toPaymentDetails(this.rows()),
    };

    const id = this.id();
    const editing = this.mode() === 'edit' && id !== undefined;
    const request = editing ? this.paymentService.update(id, payload) : this.paymentService.create(payload);

    this.saving.set(true);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success(editing ? 'Payment updated' : 'Payment added', response.message);
          this.drawerRef?.close(true);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  close() {
    this.drawerRef?.close(false);
  }

  /** Print (PDF) or Export (Excel) this payment; offered in view mode only. */
  download(format: FileFormat) {
    this.downloads.run(
      format,
      this.paymentService.exportOne(this.id()!, format, { calendar: this.calendar }),
    );
  }

  amountText(value: number | null): string {
    return String(new AmountPipe().transform(value));
  }

  /** New payments start from the Cash account. */
  private defaultMode(modes: DropdownItem[]) {
    const control = this.form.controls.payment_mode_id;
    if (this.mode() !== 'add' || control.value !== null) return;
    const cash = modes.find(mode => mode.name.toLowerCase() === 'cash');
    if (cash) control.setValue(cash.id);
  }

  private setRows(rows: SettlementRow[]) {
    const array = this.form.controls.settlement;
    array.clear({ emitEvent: false });
    rows.forEach(row => array.push(row.paid, { emitEvent: false }));
    array.updateValueAndValidity();
    this.rows.set(rows);
  }

  private load(id: number) {
    this.loading.set(true);
    this.paymentService
      .get(id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: payment => this.fill(payment),
        error: (error: unknown) => {
          this.notification.error('Could not load the payment', apiErrorMessage(error));
          this.close();
        },
      });
  }

  private fill(payment: Payment) {
    this.entryNo.set(payment.system_entry_no);
    this.saved.set(payment);
    this.pickedType = payment.type;
    this.form.patchValue({
      type: payment.type,
      party_id: partyOf(payment).id,
      date: fromIsoDate(payment.date),
      payment_mode_id: payment.payment_mode_id,
      amount: payment.amount,
    });
    this.form.markAsPristine();
  }

  private dropdown(source: Observable<DropdownItem[]>, what: string): Observable<DropdownItem[]> {
    return source.pipe(
      catchError((error: unknown) => {
        this.notification.error(`Could not load ${what}`, apiErrorMessage(error));
        return of([]);
      }),
    );
  }
}
