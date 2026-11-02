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
  Textarea,
  Toggle,
} from '@lumen-ui/angular';
import { Observable, catchError, distinctUntilChanged, finalize, forkJoin, map, of, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { CancelDialog, CancelDialogData } from '../../../../shared/components/cancel-dialog/cancel-dialog';
import { DateText } from '../../../../shared/components/date-text/date-text';
import { InvoiceSummaryCard } from '../../../../shared/components/invoice-summary-card/invoice-summary-card';
import { PartyDetailsCard } from '../../../../shared/components/party-details-card/party-details-card';
import { DropdownItem } from '../../../../shared/models/api.model';
import { DiscountType, TRANSACTION_TYPES, TransactionType } from '../../../../shared/models/invoice.model';
import { BatchStock, Product } from '../../../../shared/models/product.model';
import { AmountPipe } from '../../../../shared/pipes/amount.pipe';
import { DocNoPipe } from '../../../../shared/pipes/doc-no.pipe';
import { DropdownService } from '../../../../shared/services/dropdown.service';
import { FileDownloads } from '../../../../shared/services/file-downloads';
import { ProductLookup } from '../../../../shared/services/product-lookup';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { batchName, batchOptions, firstBatch } from '../../../../shared/utils/batch';
import { fromIsoDate, startOfToday, toIsoDate } from '../../../../shared/utils/date';
import { FileFormat } from '../../../../shared/utils/file';
import { calculateInvoice, lineAmount } from '../../../../shared/utils/invoice';
import { withMissing } from '../../../../shared/utils/options';
import { PartyService } from '../../../party/party.service';
import { Sale, SalePayload, SalesFormData, SalesFormMode, SalesLine } from '../../sales.model';
import { SalesService } from '../../sales.service';

const HEADINGS: Record<SalesFormMode, { title: string; subtitle: string; icon: IconName }> = {
  add: {
    title: 'Add Sales Invoice',
    subtitle: 'Provide essential details to create a sales invoice',
    icon: 'add',
  },
  view: {
    title: 'Sales Invoice',
    subtitle: 'Details of this sales invoice',
    icon: 'eye',
  },
};

const LINE_COLUMNS: TableColumn[] = [
  { key: 'sn', header: 'S.N', width: '48px' },
  { key: 'product', header: 'Product', width: '220px' },
  { key: 'code', header: 'Code' },
  { key: 'unit', header: 'Unit' },
  { key: 'batch', header: 'Batch', width: '230px' },
  { key: 'expiry_date', header: 'Expiry Date' },
  { key: 'stock', header: 'Stock' },
  { key: 'tax', header: 'Tax' },
  { key: 'quantity', header: 'Quantity', width: '100px' },
  { key: 'selling_price', header: 'Rate', width: '110px' },
  { key: 'mrp', header: 'MRP' },
  { key: 'amount', header: 'Amount', width: '130px', align: 'right' },
  { key: 'actions', header: '', width: '44px', align: 'center' },
];

/** Current stock and the remove button only matter while adding. */
const ADD_ONLY_COLUMNS = ['stock', 'actions'];

const NO_OPTIONS: DropdownItem[] = [];

/** One item row of the form. */
type LineForm = FormGroup<{
  product_id: FormControl<number | null>;
  batch_id: FormControl<number | null>;
  /** Shown in view mode; not sent. */
  batch_no: FormControl<string | null>;
  quantity: FormControl<number | null>;
  /** The batch's cost, sent with the line but not shown. */
  cost_price: FormControl<number | null>;
  selling_price: FormControl<number | null>;
  mrp: FormControl<number | null>;
}>;

/**
 * Sales invoice form, opened in a near full-screen bottom drawer from the list to add an
 * invoice or view a saved one. Saved invoices are never edited: view mode offers Cancel
 * instead. Each line picks the batch the goods leave.
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
    DateText,
    Icon,
    InvoiceSummaryCard,
    NumberInput,
    PartyDetailsCard,
    ReactiveFormsModule,
    Select,
    Skeleton,
    Table,
    TableCellDirective,
    Textarea,
    Toggle,
  ],
  providers: [ProductLookup, FileDownloads],
  selector: 'app-sales-entry-form',
  styleUrl: '../../../../shared/styles/document-form.scss',
  templateUrl: './sales-entry-form.html',
})
export class SalesEntryForm {
  private readonly drawerRef = inject<DrawerRef<SalesEntryForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<SalesFormData | null>(DRAWER_DATA, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dropdowns = inject(DropdownService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly lookup = inject(ProductLookup);
  private readonly modal = inject(ModalService);
  private readonly notification = inject(NotificationService);
  private readonly parties = inject(PartyService);
  private readonly salesService = inject(SalesService);
  readonly downloads = inject(FileDownloads);

  /** View needs an id; without one the form adds. */
  readonly mode: SalesFormMode = this.data?.mode === 'view' && this.data.id ? 'view' : 'add';
  readonly id = this.data?.id;
  readonly calendar: CalendarSystem = this.data?.calendar ?? 'bs';

  readonly heading = HEADINGS[this.mode];
  readonly readonly = this.mode === 'view';
  readonly lineColumns = this.readonly
    ? LINE_COLUMNS.filter(column => !ADD_ONLY_COLUMNS.includes(column.key))
    : LINE_COLUMNS;

  readonly loading = signal(false);
  readonly saving = signal(false);
  /** `system_entry_no` of the loaded sale, or a preview of the next one when adding. */
  readonly entryNo = signal<string | null>(null);
  readonly cancelled = signal(false);
  readonly cancelRemarks = signal<string | null>(null);
  readonly canCancel = computed(
    () => this.readonly && !this.cancelled() && !this.loading() && this.auth.hasOperation('CancelSalesEntry'),
  );

  readonly transactionTypes = TRANSACTION_TYPES;

  readonly form = this.fb.group({
    customer_id: this.fb.control<number | null>(null, Validators.required),
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
  /** Customer and products of a loaded sale, which the active-only dropdowns may no longer list. */
  private readonly savedCustomer = signal<DropdownItem[]>([]);
  private readonly savedProducts = signal<DropdownItem[]>([]);

  readonly customerOptions = computed(() => withMissing(this.customerList(), this.savedCustomer()));
  readonly productOptions = computed(() => withMissing(this.productList(), this.savedProducts()));

  readonly customer = toSignal(
    this.form.controls.customer_id.valueChanges.pipe(
      startWith(this.form.controls.customer_id.value),
      distinctUntilChanged(),
      switchMap(id => (id ? this.parties.get('customer', id).pipe(catchError(() => of(null))) : of(null))),
    ),
    { initialValue: null },
  );

  /** Batch picker options by product id. */
  private readonly batchOptions = computed(
    () => new Map([...this.lookup.batches()].map(([id, batches]) => [id, batchOptions(batches)])),
  );

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
      this.salesService
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

  batchItems(line: LineForm): DropdownItem[] {
    const id = line.controls.product_id.value;
    return (id && this.batchOptions().get(id)) || NO_OPTIONS;
  }

  batchOf(line: LineForm): BatchStock | undefined {
    const { product_id, batch_id } = line.controls;
    if (!product_id.value || batch_id.value === null) return undefined;
    return this.lookup.batches().get(product_id.value)?.find(batch => batch.batch_id === batch_id.value);
  }

  batchLabel(line: LineForm): string {
    return line.controls.product_id.value ? batchName(line.controls.batch_no.value) : '-';
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

  /** Sells from the product's earliest-expiring batch in stock, at that batch's prices. */
  onProductChange(line: LineForm, productId: unknown) {
    if (typeof productId !== 'number') return;
    this.loadLineProducts([productId])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (line.controls.product_id.value !== productId) return;
        this.useBatch(line, firstBatch(this.lookup.batches().get(productId) ?? []));
      });
  }

  onBatchChange(line: LineForm) {
    this.useBatch(line, this.batchOf(line));
  }

  save() {
    if (this.saving() || this.loading()) return;

    if (!this.lines().length) {
      this.notification.warn('No products', 'Add at least one product to the invoice.');
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
    const payload: SalePayload = {
      date: toIsoDate(value.date!),
      transaction_type: value.transaction_type!,
      customer_id: value.customer_id!,
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
      salesEntries: value.lines.map(line => ({
        product_id: line.product_id!,
        batch_id: line.batch_id!,
        quantity: line.quantity!,
        cost_price: line.cost_price ?? 0,
        selling_price: line.selling_price!,
        mrp: line.mrp ?? 0,
      })),
    };

    this.saving.set(true);
    this.salesService
      .create(payload)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success('Sale added', response.message);
          this.drawerRef?.close(true);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  /** Asks for a reason, cancels the invoice and closes the drawer so the list reloads. */
  cancelSale() {
    const id = this.id;
    if (!id || !this.canCancel()) return;
    const number = new DocNoPipe().transform(this.entryNo());
    this.modal
      .open<CancelDialog, CancelDialogData, boolean>(CancelDialog, {
        width: '440px',
        data: {
          title: 'Cancel sales invoice?',
          message: `${number} will be cancelled and its stock put back. It stays on record as cancelled.`,
          confirmText: 'Cancel Invoice',
          onConfirm: remarks =>
            this.salesService.cancel(id, remarks).pipe(
              tap({
                error: (error: unknown) => this.notification.error('Could not cancel', apiErrorMessage(error)),
              }),
            ),
        },
      })
      .afterClosed()
      .subscribe(done => {
        if (!done) return;
        this.notification.success('Sale cancelled', `${number} was cancelled.`);
        this.drawerRef?.close(true);
      });
  }

  close() {
    this.drawerRef?.close(false);
  }

  /** Print (PDF) or Export (Excel) this sale; offered in view mode only. */
  download(format: FileFormat) {
    this.downloads.run(
      format,
      this.salesService.exportOne(this.id!, format, { calendar: this.calendar }),
    );
  }

  private load(id: number) {
    this.loading.set(true);
    this.salesService
      .get(id)
      .pipe(
        // Product details first, so tax and the totals are right as soon as the lines show.
        switchMap(sale =>
          this.loadLineProducts(sale.salesEntries.map(line => line.product_id)).pipe(map(() => sale)),
        ),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: sale => this.fill(sale),
        error: (error: unknown) => {
          this.notification.error('Could not load the sale', apiErrorMessage(error));
          this.close();
        },
      });
  }

  private fill(sale: Sale) {
    this.entryNo.set(sale.system_entry_no);
    this.cancelled.set(sale.cancelled);
    this.cancelRemarks.set(sale.cancel_remarks);
    this.savedCustomer.set([{ id: sale.customer_id, name: sale.customer_name }]);
    this.savedProducts.set(sale.salesEntries.map(line => ({ id: line.product_id, name: line.product_name ?? '' })));

    const lines = sale.salesEntries.map(line => this.createLine(line));
    const array = this.form.controls.lines;
    array.clear({ emitEvent: false });
    lines.forEach(line => array.push(line, { emitEvent: false }));
    this.lines.set(lines);

    this.form.patchValue({
      customer_id: sale.customer_id,
      date: fromIsoDate(sale.date),
      transaction_type: sale.transaction_type,
      rounded: sale.rounded,
      // Older records have no type; their discount is an amount.
      discount_type: sale.discount_type ?? 'Flat',
      discount: sale.discount || null,
      remarks: sale.remarks ?? '',
    });
    this.form.markAsPristine();
  }

  /** Fills the batch and its prices; with no stock info, the default batch at the product's prices. */
  private useBatch(line: LineForm, batch: BatchStock | undefined) {
    const prices = batch ?? this.productOf(line);
    line.patchValue({
      batch_id: batch?.batch_id ?? 0,
      batch_no: batch?.batch_no ?? null,
      cost_price: prices?.cost_price ?? null,
      selling_price: prices?.selling_price ?? null,
      mrp: prices?.mrp ?? null,
    });
  }

  private createLine(line?: SalesLine): LineForm {
    return this.fb.group({
      product_id: this.fb.control<number | null>(line?.product_id ?? null, Validators.required),
      batch_id: this.fb.control<number | null>(line?.batch_id ?? null, Validators.required),
      batch_no: this.fb.control<string | null>(line?.batch_no ?? null),
      quantity: this.fb.control<number | null>(line?.quantity ?? null, [
        Validators.required,
        Validators.min(0.001),
      ]),
      cost_price: this.fb.control<number | null>(line?.cost_price ?? null),
      selling_price: this.fb.control<number | null>(line?.selling_price ?? null, [
        Validators.required,
        Validators.min(0),
      ]),
      mrp: this.fb.control<number | null>(line?.mrp ?? null),
    });
  }

  /** Details and batches of the given products. */
  private loadLineProducts(ids: number[]): Observable<unknown> {
    return forkJoin([this.lookup.loadProducts(ids), this.lookup.loadBatches(ids)]);
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
