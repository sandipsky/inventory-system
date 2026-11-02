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
import { Observable, catchError, distinctUntilChanged, finalize, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
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
import { docNoOptions, withMissing } from '../../../../shared/utils/options';
import { PartyService } from '../../../party/party.service';
import { PurchaseReturnService } from '../../purchase-return.service';
import {
  Purchase,
  PurchaseFormData,
  PurchaseFormMode,
  PurchaseReturn,
  PurchaseReturnLine,
  PurchaseReturnPayload,
} from '../../purchase.model';
import { PurchaseService } from '../../purchase.service';

const HEADINGS: Record<PurchaseFormMode, { title: string; subtitle: string; icon: IconName }> = {
  add: {
    title: 'Add Purchase Return',
    subtitle: 'Record goods sent back to a vendor',
    icon: 'add',
  },
  edit: {
    title: 'Edit Purchase Return',
    subtitle: 'Update the details of this purchase return',
    icon: 'edit',
  },
  view: {
    title: 'Purchase Return',
    subtitle: 'Details of this purchase return',
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
  { key: 'cost_price', header: 'Rate', width: '110px' },
  { key: 'mrp', header: 'MRP' },
  { key: 'amount', header: 'Amount', width: '130px', align: 'right' },
  { key: 'actions', header: '', width: '44px', align: 'center' },
];

/** Current stock and the remove button only matter while editing. */
const EDIT_ONLY_COLUMNS = ['stock', 'actions'];

const NO_OPTIONS: DropdownItem[] = [];

/** One item row of the form; `id` is set on lines that are already saved. */
type LineForm = FormGroup<{
  id: FormControl<number | null>;
  product_id: FormControl<number | null>;
  batch_id: FormControl<number | null>;
  /** Shown in view mode; not sent. */
  batch_no: FormControl<string | null>;
  quantity: FormControl<number | null>;
  cost_price: FormControl<number | null>;
  selling_price: FormControl<number | null>;
  mrp: FormControl<number | null>;
}>;

/**
 * Purchase return form, opened in a near full-screen bottom drawer from the list in one of
 * three modes (see PurchaseFormData). Each line picks the batch the goods leave. Picking a
 * reference purchase copies its terms and lines.
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
    TextInput,
    Textarea,
    Toggle,
  ],
  providers: [ProductLookup, FileDownloads],
  selector: 'app-purchase-return-form',
  styleUrl: '../../../../shared/styles/document-form.scss',
  templateUrl: './purchase-return-form.html',
})
export class PurchaseReturnForm {
  private readonly drawerRef = inject<DrawerRef<PurchaseReturnForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<PurchaseFormData | null>(DRAWER_DATA, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dropdowns = inject(DropdownService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly lookup = inject(ProductLookup);
  private readonly notification = inject(NotificationService);
  private readonly parties = inject(PartyService);
  private readonly purchaseService = inject(PurchaseService);
  private readonly returnService = inject(PurchaseReturnService);
  readonly downloads = inject(FileDownloads);

  readonly mode = signal<PurchaseFormMode>(this.data?.mode ?? 'add');
  readonly id = signal<number | undefined>(this.data?.id);
  readonly calendar: CalendarSystem = this.data?.calendar ?? 'bs';

  readonly heading = computed(() => HEADINGS[this.mode()]);
  readonly title = computed(() => this.heading().title);
  readonly readonly = computed(() => this.mode() === 'view');
  readonly canEdit = computed(() => this.auth.hasOperation('EditPurchaseReturn'));
  readonly lineColumns = computed(() =>
    this.readonly() ? LINE_COLUMNS.filter(column => !EDIT_ONLY_COLUMNS.includes(column.key)) : LINE_COLUMNS,
  );

  readonly loading = signal(false);
  /** Fetching the reference purchase to copy its lines. */
  readonly copying = signal(false);
  readonly saving = signal(false);
  /** `system_entry_no` of the loaded return, or a preview of the next one when adding. */
  readonly entryNo = signal<string | null>(null);

  readonly transactionTypes = TRANSACTION_TYPES;

  readonly form = this.fb.group({
    vendor_id: this.fb.control<number | null>(null, Validators.required),
    ref_purchase_id: this.fb.control<number | null>(null),
    date: this.fb.control<Date | null>(startOfToday(), Validators.required),
    bill_no: this.fb.control(''),
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

  private readonly vendorList = toSignal(this.dropdown(this.dropdowns.vendors(), 'vendors'), {
    initialValue: [],
  });
  private readonly productList = toSignal(
    this.dropdown(this.dropdowns.products('inventory', 'purchasable'), 'products'),
    { initialValue: [] },
  );
  /** Vendor, reference and products of a loaded return, which the dropdowns may no longer list. */
  private readonly savedVendor = signal<DropdownItem[]>([]);
  private readonly savedRef = signal<DropdownItem[]>([]);
  private readonly savedProducts = signal<DropdownItem[]>([]);

  readonly vendorOptions = computed(() => withMissing(this.vendorList(), this.savedVendor()));
  readonly productOptions = computed(() => withMissing(this.productList(), this.savedProducts()));

  private readonly vendorId = this.form.controls.vendor_id.valueChanges.pipe(
    startWith(this.form.controls.vendor_id.value),
    distinctUntilChanged(),
  );

  readonly vendor = toSignal(
    this.vendorId.pipe(
      switchMap(id => (id ? this.parties.get('vendor', id).pipe(catchError(() => of(null))) : of(null))),
    ),
    { initialValue: null },
  );

  /** The picked vendor's purchases, for the reference select. */
  private readonly vendorPurchases = toSignal(
    this.vendorId.pipe(
      switchMap(id =>
        id ? this.dropdowns.purchases(id).pipe(map(docNoOptions), catchError(() => of([]))) : of([]),
      ),
    ),
    { initialValue: [] },
  );
  readonly refOptions = computed(() => withMissing(this.vendorPurchases(), this.savedRef()));

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
      amount: lineAmount(line.quantity, line.cost_price),
      taxRate: (line.product_id && products.get(line.product_id)?.tax_rate) || 0,
    }));
    return calculateInvoice(lines, value.discount_type, value.discount ?? 0, value.rounded);
  });

  constructor() {
    const id = this.id();
    if (this.mode() !== 'add' && id) {
      this.load(id);
    } else {
      this.mode.set('add');
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
    return lineAmount(line.controls.quantity.value, line.controls.cost_price.value);
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

  /** A reference purchase belongs to one vendor, so picking another vendor drops it. */
  onVendorChange() {
    this.form.controls.ref_purchase_id.setValue(null);
  }

  /** Copies the picked purchase's terms and lines, replacing the current lines. */
  onRefChange(purchaseId: unknown) {
    if (typeof purchaseId !== 'number') return;
    this.copying.set(true);
    this.purchaseService
      .get(purchaseId)
      .pipe(
        switchMap(purchase => this.loadLineProducts(purchase.purchaseEntries).pipe(map(() => purchase))),
        finalize(() => this.copying.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: purchase => {
          // Picked again, or cleared, while it loaded.
          if (this.form.controls.ref_purchase_id.value === purchase.id) this.copyPurchase(purchase);
        },
        error: (error: unknown) => this.notification.error('Could not load the purchase', apiErrorMessage(error)),
      });
  }

  /** Takes the goods from the product's first batch in stock, at that batch's prices. */
  onProductChange(line: LineForm, productId: unknown) {
    if (typeof productId !== 'number') return;
    this.loadLineProducts([{ product_id: productId }])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (line.controls.product_id.value !== productId) return;
        this.useBatch(line, firstBatch(this.lookup.batches().get(productId) ?? []));
      });
  }

  onBatchChange(line: LineForm) {
    this.useBatch(line, this.batchOf(line));
  }

  startEdit() {
    this.mode.set('edit');
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
    const payload: PurchaseReturnPayload = {
      date: toIsoDate(value.date!),
      bill_no: value.bill_no.trim() || null,
      transaction_type: value.transaction_type!,
      vendor_id: value.vendor_id!,
      ref_purchase_id: value.ref_purchase_id,
      discount_type: value.discount_type,
      discount,
      sub_total: summary.gross,
      non_taxable_amount: summary.nonTaxable,
      taxable_amount: summary.taxable,
      tax: summary.tax,
      rounded: value.rounded,
      rounding: summary.rounding,
      grand_total: summary.net,
      remarks: value.remarks.trim() || null,
      purchaseReturnEntries: value.lines.map(line => ({
        // Lines keep their id so the update edits them instead of replacing them.
        id: line.id ?? undefined,
        product_id: line.product_id!,
        batch_id: line.batch_id!,
        quantity: line.quantity!,
        cost_price: line.cost_price!,
        selling_price: line.selling_price ?? 0,
        mrp: line.mrp ?? 0,
      })),
    };

    const id = this.id();
    const editing = this.mode() === 'edit' && id !== undefined;
    const request = editing ? this.returnService.update(id, payload) : this.returnService.create(payload);

    this.saving.set(true);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success(editing ? 'Purchase return updated' : 'Purchase return added', response.message);
          this.drawerRef?.close(true);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  close() {
    this.drawerRef?.close(false);
  }

  /** Print (PDF) or Export (Excel) this return; offered in view mode only. */
  download(format: FileFormat) {
    this.downloads.run(
      format,
      this.returnService.exportOne(this.id()!, format, { calendar: this.calendar }),
    );
  }

  private load(id: number) {
    this.loading.set(true);
    this.returnService
      .get(id)
      .pipe(
        // Product details first, so tax and the totals are right as soon as the lines show.
        switchMap(saved => this.loadLineProducts(saved.purchaseReturnEntries).pipe(map(() => saved))),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: saved => this.fill(saved),
        error: (error: unknown) => {
          this.notification.error('Could not load the purchase return', apiErrorMessage(error));
          this.close();
        },
      });
  }

  private fill(saved: PurchaseReturn) {
    this.entryNo.set(saved.system_entry_no);
    this.savedVendor.set([{ id: saved.vendor_id, name: saved.vendor_name }]);
    this.savedRef.set(
      saved.ref_purchase_id
        ? [{ id: saved.ref_purchase_id, name: new DocNoPipe().transform(saved.ref_purchase_no) }]
        : [],
    );
    this.savedProducts.set(
      saved.purchaseReturnEntries.map(line => ({ id: line.product_id, name: line.product_name ?? '' })),
    );
    this.setLines(saved.purchaseReturnEntries.map(line => this.createLine(line)));

    this.form.patchValue({
      vendor_id: saved.vendor_id,
      ref_purchase_id: saved.ref_purchase_id,
      date: fromIsoDate(saved.date),
      bill_no: saved.bill_no ?? '',
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
   * The return takes over the purchase's bill, terms and discount, and returns every line in full
   * from the batch it went into; the user then trims what is not going back.
   */
  private copyPurchase(purchase: Purchase) {
    this.savedProducts.update(items =>
      withMissing(
        items,
        purchase.purchaseEntries.map(line => ({ id: line.product_id, name: line.product_name ?? '' })),
      ),
    );
    this.setLines(
      purchase.purchaseEntries.map(line =>
        this.createLine({
          product_id: line.product_id,
          batch_id: line.batch_id ?? 0,
          batch_no: line.batch_no,
          quantity: line.quantity,
          cost_price: line.cost_price,
          selling_price: line.selling_price,
          mrp: line.mrp,
        }),
      ),
    );
    this.form.patchValue({
      bill_no: purchase.bill_no,
      transaction_type: purchase.transaction_type,
      rounded: purchase.rounded,
      discount_type: purchase.discount_type ?? 'Flat',
      discount: purchase.discount || null,
    });
  }

  private setLines(lines: LineForm[]) {
    const array = this.form.controls.lines;
    array.clear({ emitEvent: false });
    lines.forEach(line => array.push(line, { emitEvent: false }));
    array.updateValueAndValidity();
    this.lines.set(lines);
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

  private createLine(line?: Omit<PurchaseReturnLine, 'id'> & { id?: number }): LineForm {
    return this.fb.group({
      id: this.fb.control<number | null>(line?.id ?? null),
      product_id: this.fb.control<number | null>(line?.product_id ?? null, Validators.required),
      batch_id: this.fb.control<number | null>(line?.batch_id ?? null, Validators.required),
      batch_no: this.fb.control<string | null>(line?.batch_no ?? null),
      quantity: this.fb.control<number | null>(line?.quantity ?? null, [
        Validators.required,
        Validators.min(0.001),
      ]),
      cost_price: this.fb.control<number | null>(line?.cost_price ?? null, [
        Validators.required,
        Validators.min(0),
      ]),
      selling_price: this.fb.control<number | null>(line?.selling_price ?? null),
      mrp: this.fb.control<number | null>(line?.mrp ?? null),
    });
  }

  /** Details and batches of the lines' products. */
  private loadLineProducts(lines: { product_id: number }[]): Observable<unknown> {
    const ids = lines.map(line => line.product_id);
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
