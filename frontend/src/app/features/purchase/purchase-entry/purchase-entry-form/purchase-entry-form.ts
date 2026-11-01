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
import { Observable, catchError, distinctUntilChanged, finalize, map, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { InvoiceSummaryCard } from '../../../../shared/components/invoice-summary-card/invoice-summary-card';
import { PartyDetailsCard } from '../../../../shared/components/party-details-card/party-details-card';
import { DropdownItem } from '../../../../shared/models/api.model';
import { DiscountType, TRANSACTION_TYPES, TransactionType } from '../../../../shared/models/invoice.model';
import { Product } from '../../../../shared/models/product.model';
import { AmountPipe } from '../../../../shared/pipes/amount.pipe';
import { DocNoPipe } from '../../../../shared/pipes/doc-no.pipe';
import { DropdownService } from '../../../../shared/services/dropdown.service';
import { ProductLookup } from '../../../../shared/services/product-lookup';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { downloadCsv } from '../../../../shared/utils/csv';
import { fromIsoDate, startOfToday, toIsoDate } from '../../../../shared/utils/date';
import { calculateInvoice, lineAmount } from '../../../../shared/utils/invoice';
import { withMissing } from '../../../../shared/utils/options';
import {
  Purchase,
  PurchaseFormData,
  PurchaseFormMode,
  PurchaseLine,
  PurchasePayload,
} from '../../purchase.model';
import { PurchaseService } from '../../purchase.service';

const HEADINGS: Record<PurchaseFormMode, { title: string; subtitle: string; icon: IconName }> = {
  add: {
    title: 'Add Purchase Invoice',
    subtitle: 'Provide essential details to create a purchase invoice',
    icon: 'add',
  },
  edit: {
    title: 'Edit Purchase Invoice',
    subtitle: 'Update the details of this purchase invoice',
    icon: 'edit',
  },
  view: {
    title: 'Purchase Invoice',
    subtitle: 'Details of this purchase invoice',
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
  { key: 'cost_price', header: 'Rate', width: '110px' },
  { key: 'mrp', header: 'MRP', width: '110px' },
  { key: 'selling_price', header: 'SP', width: '110px' },
  { key: 'amount', header: 'Amount', width: '130px', align: 'right' },
  { key: 'actions', header: '', width: '44px', align: 'center' },
];

/** One item row of the form; `id` is set on lines that are already saved. */
type LineForm = FormGroup<{
  id: FormControl<number | null>;
  product_id: FormControl<number | null>;
  batch_no: FormControl<string>;
  expiry_date: FormControl<Date | null>;
  quantity: FormControl<number | null>;
  cost_price: FormControl<number | null>;
  selling_price: FormControl<number | null>;
  mrp: FormControl<number | null>;
}>;

/**
 * Purchase invoice form, opened in a near full-screen bottom drawer from the list in one of
 * three modes (see PurchaseFormData). The drawer ref and data are optional so
 * the component also renders inline (e.g. in tests), defaulting to `add`.
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
  providers: [ProductLookup],
  selector: 'app-purchase-entry-form',
  styleUrl: '../../../../shared/styles/document-form.scss',
  templateUrl: './purchase-entry-form.html',
})
export class PurchaseEntryForm {
  private readonly drawerRef = inject<DrawerRef<PurchaseEntryForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<PurchaseFormData | null>(DRAWER_DATA, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dropdowns = inject(DropdownService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notification = inject(NotificationService);
  private readonly lookup = inject(ProductLookup);
  private readonly purchaseService = inject(PurchaseService);

  readonly mode = signal<PurchaseFormMode>(this.data?.mode ?? 'add');
  readonly id = signal<number | undefined>(this.data?.id);
  readonly calendar: CalendarSystem = this.data?.calendar ?? 'bs';

  readonly heading = computed(() => HEADINGS[this.mode()]);
  readonly title = computed(() => this.heading().title);
  readonly readonly = computed(() => this.mode() === 'view');
  readonly canEdit = computed(() => this.auth.hasOperation('EditPurchaseEntry'));
  readonly lineColumns = computed(() =>
    this.readonly() ? LINE_COLUMNS.filter(column => column.key !== 'actions') : LINE_COLUMNS,
  );

  readonly loading = signal(false);
  readonly saving = signal(false);
  /** `system_entry_no` of the loaded purchase, or a preview of the next one when adding. */
  readonly entryNo = signal<string | null>(null);

  readonly transactionTypes = TRANSACTION_TYPES;

  readonly form = this.fb.group({
    vendor_id: this.fb.control<number | null>(null, Validators.required),
    date: this.fb.control<Date | null>(startOfToday(), Validators.required),
    bill_no: this.fb.control('', Validators.required),
    bill_date: this.fb.control<Date | null>(null, Validators.required),
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
  /** Vendor and products of a loaded purchase, which the active-only dropdowns may no longer list. */
  private readonly savedVendor = signal<DropdownItem[]>([]);
  private readonly savedProducts = signal<DropdownItem[]>([]);

  readonly vendorOptions = computed(() => withMissing(this.vendorList(), this.savedVendor()));
  readonly productOptions = computed(() => withMissing(this.productList(), this.savedProducts()));

  readonly vendor = toSignal(
    this.form.controls.vendor_id.valueChanges.pipe(
      startWith(this.form.controls.vendor_id.value),
      distinctUntilChanged(),
      switchMap(id => (id ? this.purchaseService.vendor(id).pipe(catchError(() => of(null))) : of(null))),
    ),
    { initialValue: null },
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
      this.purchaseService
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

  /** Fills the line's prices from the picked product (the product's last purchase prices). */
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

  startEdit() {
    this.mode.set('edit');
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
    const payload: PurchasePayload = {
      date: toIsoDate(value.date!),
      bill_date: value.bill_date ? toIsoDate(value.bill_date) : null,
      bill_no: value.bill_no.trim(),
      transaction_type: value.transaction_type!,
      vendor_id: value.vendor_id!,
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
      purchaseEntries: value.lines.map(line => ({
        // Lines keep their id so the update edits them instead of replacing them.
        id: line.id ?? undefined,
        product_id: line.product_id!,
        batch_no: line.batch_no.trim() || null,
        expiry_date: line.expiry_date ? toIsoDate(line.expiry_date) : null,
        quantity: line.quantity!,
        cost_price: line.cost_price!,
        selling_price: line.selling_price ?? 0,
        mrp: line.mrp ?? 0,
      })),
    };

    const id = this.id();
    const editing = this.mode() === 'edit' && id !== undefined;
    const request = editing ? this.purchaseService.update(id, payload) : this.purchaseService.create(payload);

    this.saving.set(true);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success(editing ? 'Purchase updated' : 'Purchase added', response.message);
          this.drawerRef?.close(true);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  close() {
    this.drawerRef?.close(false);
  }

  /** Offered in view mode only, so the printout shows values as text rather than inputs. */
  print() {
    window.print();
  }

  /** The item lines as a CSV file. */
  exportLines() {
    const docNo = new DocNoPipe().transform(this.entryNo()) || 'purchase-invoice';
    downloadCsv(docNo.replace(/[^\w-]+/g, '-'), [
      ['S.N', 'Product', 'Code', 'Unit', 'Batch No.', 'Expiry Date', 'Tax', 'Quantity', 'Rate', 'MRP', 'SP', 'Amount'],
      ...this.lines().map((line, index) => {
        const value = line.getRawValue();
        const product = this.productOf(line);
        const name = this.productOptions().find(option => option.id === value.product_id)?.name;
        return [
          index + 1,
          name ?? product?.name,
          product?.code,
          product?.unit_name,
          value.batch_no,
          value.expiry_date ? toIsoDate(value.expiry_date) : '',
          this.taxLabel(line),
          value.quantity,
          value.cost_price,
          value.mrp,
          value.selling_price,
          this.amountOf(line),
        ];
      }),
    ]);
  }

  private load(id: number) {
    this.loading.set(true);
    this.purchaseService
      .get(id)
      .pipe(
        // Product details first, so tax and the totals are right as soon as the lines show.
        switchMap(purchase =>
          this.lookup.loadProducts(purchase.purchaseEntries.map(line => line.product_id)).pipe(map(() => purchase)),
        ),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: purchase => this.fill(purchase),
        error: (error: unknown) => {
          this.notification.error('Could not load the purchase', apiErrorMessage(error));
          this.close();
        },
      });
  }

  private fill(purchase: Purchase) {
    this.entryNo.set(purchase.system_entry_no);
    this.savedVendor.set([{ id: purchase.vendor_id, name: purchase.vendor_name }]);
    this.savedProducts.set(
      purchase.purchaseEntries.map(line => ({ id: line.product_id, name: line.product_name ?? '' })),
    );

    const lines = purchase.purchaseEntries.map(line => this.createLine(line));
    const array = this.form.controls.lines;
    array.clear({ emitEvent: false });
    lines.forEach(line => array.push(line, { emitEvent: false }));
    this.lines.set(lines);

    this.form.patchValue({
      vendor_id: purchase.vendor_id,
      date: fromIsoDate(purchase.date),
      bill_no: purchase.bill_no,
      bill_date: fromIsoDate(purchase.bill_date),
      transaction_type: purchase.transaction_type,
      rounded: purchase.rounded,
      // Older records have no type; their discount is an amount.
      discount_type: purchase.discount_type ?? 'Flat',
      discount: purchase.discount || null,
      remarks: purchase.remarks ?? '',
    });
    this.form.markAsPristine();
  }

  private createLine(line?: PurchaseLine): LineForm {
    return this.fb.group({
      id: this.fb.control<number | null>(line?.id ?? null),
      product_id: this.fb.control<number | null>(line?.product_id ?? null, Validators.required),
      batch_no: this.fb.control(line?.batch_no ?? ''),
      expiry_date: this.fb.control<Date | null>(fromIsoDate(line?.expiry_date)),
      quantity: this.fb.control<number | null>(line?.quantity ?? null, [
        Validators.required,
        Validators.min(0.001),
      ]),
      cost_price: this.fb.control<number | null>(line?.cost_price ?? null, [
        Validators.required,
        Validators.min(0),
      ]),
      selling_price: this.fb.control<number | null>(line?.selling_price ?? null, Validators.min(0)),
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
