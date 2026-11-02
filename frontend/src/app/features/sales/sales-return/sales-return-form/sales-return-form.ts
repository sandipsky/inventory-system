import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Button,
  CalendarSystem,
  Card,
  DRAWER_DATA,
  DateInput,
  DrawerRef,
  Icon,
  IconName,
  ModalService,
  NotificationService,
  NumberInput,
  Select,
  Skeleton,
  Table,
  TableCellDirective,
  TableColumn,
  TextInput,
  Textarea,
  Toggle,
} from '@lumen-ui/angular';
import { Observable, catchError, distinctUntilChanged, finalize, map, of, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { CancelDialog, CancelDialogData } from '../../../../shared/components/cancel-dialog/cancel-dialog';
import { InvoiceSummaryCard } from '../../../../shared/components/invoice-summary-card/invoice-summary-card';
import { PartyDetailsCard } from '../../../../shared/components/party-details-card/party-details-card';
import { DropdownItem } from '../../../../shared/models/api.model';
import { DiscountType, TRANSACTION_TYPES, TransactionType } from '../../../../shared/models/invoice.model';
import { Product } from '../../../../shared/models/product.model';
import { AmountPipe } from '../../../../shared/pipes/amount.pipe';
import { DocNoPipe } from '../../../../shared/pipes/doc-no.pipe';
import { DropdownService } from '../../../../shared/services/dropdown.service';
import { FileDownloads } from '../../../../shared/services/file-downloads';
import { ProductLookup } from '../../../../shared/services/product-lookup';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { fromIsoDate, startOfToday, toIsoDate } from '../../../../shared/utils/date';
import { FileFormat } from '../../../../shared/utils/file';
import { calculateInvoice, lineAmount } from '../../../../shared/utils/invoice';
import { docNoOptions, withMissing } from '../../../../shared/utils/options';
import { PartyService } from '../../../party/party.service';
import { SalesReturnService } from '../../sales-return.service';
import {
  Sale,
  SalesFormData,
  SalesFormMode,
  SalesReturn,
  SalesReturnLine,
  SalesReturnPayload,
} from '../../sales.model';
import { SalesService } from '../../sales.service';

const HEADINGS: Record<SalesFormMode, { title: string; subtitle: string; icon: IconName }> = {
  add: {
    title: 'Add Sales Return',
    subtitle: 'Record goods a customer brought back',
    icon: 'add',
  },
  view: {
    title: 'Sales Return',
    subtitle: 'Details of this sales return',
    icon: 'eye',
  },
};

const LINE_COLUMNS: TableColumn[] = [
  { key: 'sn', header: 'S.N', width: '48px' },
  { key: 'product', header: 'Product', width: '220px' },
  { key: 'code', header: 'Code' },
  { key: 'unit', header: 'Unit' },
  { key: 'batch_no', header: 'Batch No.', width: '130px' },
  { key: 'expiry_date', header: 'Expiry Date', width: '140px' },
  { key: 'tax', header: 'Tax' },
  { key: 'quantity', header: 'Quantity', width: '100px' },
  { key: 'selling_price', header: 'Rate', width: '110px' },
  { key: 'mrp', header: 'MRP', width: '110px' },
  { key: 'amount', header: 'Amount', width: '130px', align: 'right' },
  { key: 'actions', header: '', width: '44px', align: 'center' },
];

/** One item row of the form. */
type LineForm = FormGroup<{
  product_id: FormControl<number | null>;
  batch_no: FormControl<string>;
  expiry_date: FormControl<Date | null>;
  quantity: FormControl<number | null>;
  /** Prices a new batch; not shown. */
  cost_price: FormControl<number | null>;
  selling_price: FormControl<number | null>;
  mrp: FormControl<number | null>;
}>;

/**
 * Sales return form, opened in a near full-screen bottom drawer from the list to add a return
 * or view a saved one. Saved returns are never edited: view mode offers Cancel instead. Each
 * line types the batch the goods go back into, like a purchase. Picking a reference invoice
 * copies its terms and lines.
 *
 * The API stores the totals it is sent, so they are calculated here (calculateInvoice).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AmountPipe,
    Button,
    Card,
    DateInput,
    Icon,
    InvoiceSummaryCard,
    NumberInput,
    PartyDetailsCard,
    ReactiveFormsModule,
    Select,
    Skeleton,
    Table,
    TableCellDirective,
    TextInput,
    Textarea,
    Toggle,
  ],
  providers: [ProductLookup, FileDownloads],
  selector: 'app-sales-return-form',
  styleUrl: '../../../../shared/styles/document-form.scss',
  templateUrl: './sales-return-form.html',
})
export class SalesReturnForm {
  private readonly drawerRef = inject<DrawerRef<SalesReturnForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<SalesFormData | null>(DRAWER_DATA, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dropdowns = inject(DropdownService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly lookup = inject(ProductLookup);
  private readonly modal = inject(ModalService);
  private readonly notification = inject(NotificationService);
  private readonly parties = inject(PartyService);
  private readonly returnService = inject(SalesReturnService);
  readonly downloads = inject(FileDownloads);
  private readonly salesService = inject(SalesService);

  /** View needs an id; without one the form adds. */
  readonly mode: SalesFormMode = this.data?.mode === 'view' && this.data.id ? 'view' : 'add';
  readonly id = this.data?.id;
  readonly calendar: CalendarSystem = this.data?.calendar ?? 'bs';

  readonly heading = HEADINGS[this.mode];
  readonly readonly = this.mode === 'view';
  readonly lineColumns = this.readonly ? LINE_COLUMNS.filter(column => column.key !== 'actions') : LINE_COLUMNS;

  readonly loading = signal(false);
  /** Fetching the reference invoice to copy its lines. */
  readonly copying = signal(false);
  readonly saving = signal(false);
  /** `system_entry_no` of the loaded return, or a preview of the next one when adding. */
  readonly entryNo = signal<string | null>(null);
  readonly cancelled = signal(false);
  readonly cancelRemarks = signal<string | null>(null);
  readonly canCancel = computed(
    () => this.readonly && !this.cancelled() && !this.loading() && this.auth.hasOperation('CancelSalesReturn'),
  );

  readonly transactionTypes = TRANSACTION_TYPES;

  readonly form = this.fb.group({
    customer_id: this.fb.control<number | null>(null, Validators.required),
    ref_sales_id: this.fb.control<number | null>(null),
    date: this.fb.control<Date | null>(startOfToday(), Validators.required),
    transaction_type: this.fb.control<TransactionType | null>(null, Validators.required),
    rounded: this.fb.control(true),
    discount_type: this.fb.control<DiscountType>('Percentage'),
    discount: this.fb.control<number | null>(null, Validators.min(0)),
    remarks: this.fb.control(''),
    lines: this.fb.array<LineForm>([]),
  });

  /** The line groups as a signal, so the table re-renders when a line is added or removed. */
  readonly lines = signal<LineForm[]>([]);
  readonly trackLine = (line: LineForm) => line;

  private readonly customerList = toSignal(this.dropdown(this.dropdowns.customers(), 'customers'), {
    initialValue: [],
  });
  private readonly productList = toSignal(
    this.dropdown(this.dropdowns.products('inventory', 'sellable'), 'products'),
    { initialValue: [] },
  );
  /** Customer, reference and products of a loaded return, which the dropdowns may no longer list. */
  private readonly savedCustomer = signal<DropdownItem[]>([]);
  private readonly savedRef = signal<DropdownItem[]>([]);
  private readonly savedProducts = signal<DropdownItem[]>([]);

  readonly customerOptions = computed(() => withMissing(this.customerList(), this.savedCustomer()));
  readonly productOptions = computed(() => withMissing(this.productList(), this.savedProducts()));

  private readonly customerId = this.form.controls.customer_id.valueChanges.pipe(
    startWith(this.form.controls.customer_id.value),
    distinctUntilChanged(),
  );

  readonly customer = toSignal(
    this.customerId.pipe(
      switchMap(id => (id ? this.parties.get('customer', id).pipe(catchError(() => of(null))) : of(null))),
    ),
    { initialValue: null },
  );

  /** The picked customer's invoices that are not cancelled, for the reference select. */
  private readonly customerSales = toSignal(
    this.customerId.pipe(
      switchMap(id => (id ? this.dropdowns.sales(id).pipe(map(docNoOptions), catchError(() => of([]))) : of([]))),
    ),
    { initialValue: [] },
  );
  readonly refOptions = computed(() => withMissing(this.customerSales(), this.savedRef()));

  private readonly value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  readonly summary = computed(() => {
    const value = this.value();
    const products = this.lookup.products();
    const lines = value.lines.map(line => ({
      amount: lineAmount(line.quantity, line.selling_price),
      taxRate: (line.product_id && products.get(line.product_id)?.tax_rate) || 0,
    }));
    return calculateInvoice(lines, value.discount_type, value.discount ?? 0, value.rounded);
  });

  constructor() {
    if (this.readonly) {
      this.load(this.id!);
    } else {
      this.addLine();
      this.returnService
        .nextNumber()
        .pipe(catchError(() => of(null)), takeUntilDestroyed())
        .subscribe(number => this.entryNo.set(number));
    }
  }

  serial(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  productOf(line: LineForm): Product | undefined {
    const id = line.controls.product_id.value;
    return id ? this.lookup.products().get(id) : undefined;
  }

  taxLabel(line: LineForm): string {
    const rate = this.productOf(line)?.tax_rate;
    return rate ? `${rate}%` : '-';
  }

  amountOf(line: LineForm): number {
    return lineAmount(line.controls.quantity.value, line.controls.selling_price.value);
  }

  addLine() {
    const line = this.createLine();
    this.form.controls.lines.push(line);
    this.lines.update(lines => [...lines, line]);
  }

  removeLine(line: LineForm) {
    const index = this.form.controls.lines.controls.indexOf(line);
    if (index < 0) return;
    this.form.controls.lines.removeAt(index);
    this.lines.update(lines => lines.filter(item => item !== line));
  }

  /** A reference invoice belongs to one customer, so picking another customer drops it. */
  onCustomerChange() {
    this.form.controls.ref_sales_id.setValue(null);
  }

  /** Copies the picked invoice's terms and lines, replacing the current lines. */
  onRefChange(salesId: unknown) {
    if (typeof salesId !== 'number') return;
    this.copying.set(true);
    this.salesService
      .get(salesId)
      .pipe(
        switchMap(sale =>
          this.lookup.loadProducts(sale.salesEntries.map(line => line.product_id)).pipe(map(() => sale)),
        ),
        finalize(() => this.copying.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: sale => {
          // Picked again, or cleared, while it loaded.
          if (this.form.controls.ref_sales_id.value === sale.id) this.copySale(sale);
        },
        error: (error: unknown) => this.notification.error('Could not load the invoice', apiErrorMessage(error)),
      });
  }

  /** Prices the line from the picked product. */
  onProductChange(line: LineForm, productId: unknown) {
    if (typeof productId !== 'number') return;
    this.lookup
      .loadProducts([productId])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const product = this.lookup.products().get(productId);
        if (!product || line.controls.product_id.value !== productId) return;
        line.patchValue({
          cost_price: product.cost_price,
          selling_price: product.selling_price,
          mrp: product.mrp,
        });
      });
  }

  save() {
    if (this.saving() || this.loading() || this.copying()) return;

    if (!this.lines().length) {
      this.notification.warn('No products', 'Add at least one product to the return.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warn('Missing details', 'Fill in the fields highlighted in red.');
      return;
    }

    const value = this.form.getRawValue();
    const summary = this.summary();
    const discount = value.discount ?? 0;
    if (value.discount_type === 'Percentage' ? discount > 100 : discount > summary.gross) {
      this.notification.warn('Discount too large', 'The discount cannot be more than the gross amount.');
      return;
    }

    // Required fields are checked above, so the non-null assertions hold.
    const payload: SalesReturnPayload = {
      date: toIsoDate(value.date!),
      transaction_type: value.transaction_type!,
      customer_id: value.customer_id!,
      ref_sales_id: value.ref_sales_id,
      discount_type: value.discount_type,
      discount,
      sub_total: summary.gross,
      non_taxable_amount: summary.nonTaxable,
      taxable_amount: summary.taxable,
      total_tax: summary.tax,
      rounded: value.rounded,
      rounding: summary.rounding,
      grand_total: summary.net,
      remarks: value.remarks.trim() || null,
      salesReturnEntries: value.lines.map(line => ({
        product_id: line.product_id!,
        batch_no: line.batch_no.trim() || null,
        expiry_date: line.expiry_date ? toIsoDate(line.expiry_date) : null,
        quantity: line.quantity!,
        cost_price: line.cost_price ?? 0,
        selling_price: line.selling_price!,
        mrp: line.mrp ?? 0,
      })),
    };

    this.saving.set(true);
    this.returnService
      .create(payload)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success('Sales return added', response.message);
          this.drawerRef?.close(true);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  /** Asks for a reason, cancels the return and closes the drawer so the list reloads. */
  cancelReturn() {
    const id = this.id;
    if (!id || !this.canCancel()) return;
    const number = new DocNoPipe().transform(this.entryNo());
    this.modal
      .open<CancelDialog, CancelDialogData, boolean>(CancelDialog, {
        width: '440px',
        data: {
          title: 'Cancel sales return?',
          message: `${number} will be cancelled and its goods taken back out of stock. It stays on record as cancelled.`,
          confirmText: 'Cancel Return',
          onConfirm: remarks =>
            this.returnService.cancel(id, remarks).pipe(
              tap({
                error: (error: unknown) => this.notification.error('Could not cancel', apiErrorMessage(error)),
              }),
            ),
        },
      })
      .afterClosed()
      .subscribe(done => {
        if (!done) return;
        this.notification.success('Sales return cancelled', `${number} was cancelled.`);
        this.drawerRef?.close(true);
      });
  }

  close() {
    this.drawerRef?.close(false);
  }

  /** Print (PDF) or Export (Excel) this return; offered in view mode only. */
  download(format: FileFormat) {
    this.downloads.run(
      format,
      this.returnService.exportOne(this.id!, format, { calendar: this.calendar }),
    );
  }

  private load(id: number) {
    this.loading.set(true);
    this.returnService
      .get(id)
      .pipe(
        // Product details first, so tax and the totals are right as soon as the lines show.
        switchMap(saved =>
          this.lookup.loadProducts(saved.salesReturnEntries.map(line => line.product_id)).pipe(map(() => saved)),
        ),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: saved => this.fill(saved),
        error: (error: unknown) => {
          this.notification.error('Could not load the sales return', apiErrorMessage(error));
          this.close();
        },
      });
  }

  private fill(saved: SalesReturn) {
    this.entryNo.set(saved.system_entry_no);
    this.cancelled.set(saved.cancelled);
    this.cancelRemarks.set(saved.cancel_remarks);
    this.savedCustomer.set([{ id: saved.customer_id, name: saved.customer_name }]);
    this.savedRef.set(
      saved.ref_sales_id ? [{ id: saved.ref_sales_id, name: new DocNoPipe().transform(saved.ref_sales_no) }] : [],
    );
    this.savedProducts.set(
      saved.salesReturnEntries.map(line => ({ id: line.product_id, name: line.product_name ?? '' })),
    );
    this.setLines(saved.salesReturnEntries.map(line => this.createLine(line)));

    this.form.patchValue({
      customer_id: saved.customer_id,
      ref_sales_id: saved.ref_sales_id,
      date: fromIsoDate(saved.date),
      transaction_type: saved.transaction_type,
      rounded: saved.rounded,
      // Older records have no type; their discount is an amount.
      discount_type: saved.discount_type ?? 'Flat',
      discount: saved.discount || null,
      remarks: saved.remarks ?? '',
    });
    this.form.markAsPristine();
  }

  /**
   * The return takes over the invoice's terms and discount, and every line in full back into the
   * batch it was sold from; the user then trims what did not come back.
   */
  private copySale(sale: Sale) {
    this.savedProducts.update(items =>
      withMissing(
        items,
        sale.salesEntries.map(line => ({ id: line.product_id, name: line.product_name ?? '' })),
      ),
    );
    this.setLines(
      sale.salesEntries.map(line =>
        this.createLine({
          product_id: line.product_id,
          batch_no: line.batch_no ?? null,
          // Blank keeps the batch's own expiry date.
          expiry_date: null,
          quantity: line.quantity,
          cost_price: line.cost_price,
          selling_price: line.selling_price,
          mrp: line.mrp,
        }),
      ),
    );
    this.form.patchValue({
      transaction_type: sale.transaction_type,
      rounded: sale.rounded,
      discount_type: sale.discount_type ?? 'Flat',
      discount: sale.discount || null,
    });
  }

  private setLines(lines: LineForm[]) {
    const array = this.form.controls.lines;
    array.clear({ emitEvent: false });
    lines.forEach(line => array.push(line, { emitEvent: false }));
    array.updateValueAndValidity();
    this.lines.set(lines);
  }

  private createLine(line?: SalesReturnLine): LineForm {
    return this.fb.group({
      product_id: this.fb.control<number | null>(line?.product_id ?? null, Validators.required),
      batch_no: this.fb.control(line?.batch_no ?? ''),
      expiry_date: this.fb.control<Date | null>(fromIsoDate(line?.expiry_date)),
      quantity: this.fb.control<number | null>(line?.quantity ?? null, [
        Validators.required,
        Validators.min(0.001),
      ]),
      cost_price: this.fb.control<number | null>(line?.cost_price ?? null),
      selling_price: this.fb.control<number | null>(line?.selling_price ?? null, [
        Validators.required,
        Validators.min(0),
      ]),
      mrp: this.fb.control<number | null>(line?.mrp ?? null, Validators.min(0)),
    });
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
