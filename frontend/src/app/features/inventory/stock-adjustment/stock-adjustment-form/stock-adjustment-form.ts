import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Button,
  CalendarSystem,
  Card,
  Chip,
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
} from '@lumen-ui/angular';
import { Observable, catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { DateText } from '../../../../shared/components/date-text/date-text';
import { DropdownItem } from '../../../../shared/models/api.model';
import { BatchStock, Product } from '../../../../shared/models/product.model';
import { DocNoPipe } from '../../../../shared/pipes/doc-no.pipe';
import { DropdownService } from '../../../../shared/services/dropdown.service';
import { ProductLookup } from '../../../../shared/services/product-lookup';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { batchName, batchOptions, firstBatch } from '../../../../shared/utils/batch';
import { downloadCsv } from '../../../../shared/utils/csv';
import { fromIsoDate, startOfToday, toIsoDate } from '../../../../shared/utils/date';
import { withMissing } from '../../../../shared/utils/options';
import {
  ADJUSTMENT_TYPES,
  AdjustmentType,
  StockAdjustment,
  StockAdjustmentFormData,
  StockAdjustmentFormMode,
  StockAdjustmentLine,
  StockAdjustmentPayload,
} from '../../inventory.model';
import { StockAdjustmentService } from '../../stock-adjustment.service';

const HEADINGS: Record<StockAdjustmentFormMode, { title: string; subtitle: string; icon: IconName }> = {
  add: {
    title: 'Add Stock Adjustment',
    subtitle: 'Move stock in or out of product batches after a count, breakage or loss',
    icon: 'add',
  },
  edit: {
    title: 'Edit Stock Adjustment',
    subtitle: 'Update the details of this stock adjustment',
    icon: 'edit',
  },
  view: {
    title: 'Stock Adjustment',
    subtitle: 'Details of this stock adjustment',
    icon: 'eye',
  },
};

const LINE_COLUMNS: TableColumn[] = [
  { key: 'sn', header: 'S.N', width: '48px' },
  { key: 'product', header: 'Product', width: '240px' },
  { key: 'code', header: 'Code' },
  { key: 'unit', header: 'Unit' },
  { key: 'batch', header: 'Batch', width: '230px' },
  { key: 'expiry_date', header: 'Expiry Date' },
  { key: 'stock', header: 'Stock' },
  { key: 'adjustment_type', header: 'Type', width: '140px' },
  { key: 'quantity', header: 'Quantity', width: '110px' },
  { key: 'reason', header: 'Reason', width: '240px' },
  { key: 'actions', header: '', width: '44px', align: 'center' },
];

/** Current stock and the remove button only matter while editing. */
const EDIT_ONLY_COLUMNS = ['stock', 'actions'];

const NO_OPTIONS: DropdownItem[] = [];

/** One line of the form; `id` is set on lines that are already saved. */
type LineForm = FormGroup<{
  id: FormControl<number | null>;
  product_id: FormControl<number | null>;
  batch_id: FormControl<number | null>;
  /** Shown in view mode; not sent. */
  batch_no: FormControl<string | null>;
  adjustment_type: FormControl<AdjustmentType | null>;
  quantity: FormControl<number | null>;
  reason: FormControl<string>;
}>;

/**
 * Stock adjustment form, opened in a near full-screen bottom drawer from the list in one of three
 * modes (see StockAdjustmentFormData). Each line picks a product batch and moves stock in or out of
 * it. The drawer ref and data are optional so the component also renders inline (e.g. in tests).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Button,
    Card,
    Chip,
    DateInput,
    DateText,
    DocNoPipe,
    Icon,
    NumberInput,
    ReactiveFormsModule,
    Select,
    Skeleton,
    Table,
    TableCellDirective,
    TextInput,
    Textarea,
  ],
  providers: [ProductLookup],
  selector: 'app-stock-adjustment-form',
  styleUrls: ['../../../../shared/styles/document-form.scss', './stock-adjustment-form.scss'],
  templateUrl: './stock-adjustment-form.html',
})
export class StockAdjustmentForm {
  private readonly drawerRef = inject<DrawerRef<StockAdjustmentForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<StockAdjustmentFormData | null>(DRAWER_DATA, { optional: true });
  private readonly adjustmentService = inject(StockAdjustmentService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dropdowns = inject(DropdownService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly lookup = inject(ProductLookup);
  private readonly notification = inject(NotificationService);

  readonly mode = signal<StockAdjustmentFormMode>(this.data?.mode ?? 'add');
  readonly id = signal<number | undefined>(this.data?.id);
  readonly calendar: CalendarSystem = this.data?.calendar ?? 'bs';

  readonly heading = computed(() => HEADINGS[this.mode()]);
  readonly readonly = computed(() => this.mode() === 'view');
  readonly canEdit = computed(() => this.auth.hasOperation('EditStockAdjustment'));
  readonly lineColumns = computed(() =>
    this.readonly() ? LINE_COLUMNS.filter(column => !EDIT_ONLY_COLUMNS.includes(column.key)) : LINE_COLUMNS,
  );

  readonly loading = signal(false);
  readonly saving = signal(false);
  /** `system_entry_no` of the loaded adjustment, or a preview of the next one when adding. */
  readonly entryNo = signal<string | null>(null);

  readonly adjustmentTypes = ADJUSTMENT_TYPES;

  readonly form = this.fb.group({
    date: this.fb.control<Date | null>(startOfToday(), Validators.required),
    remarks: this.fb.control(''),
    lines: this.fb.array<LineForm>([]),
  });

  /** The line groups as a signal, so the table re-renders when a line is added or removed. */
  readonly lines = signal<LineForm[]>([]);
  readonly trackLine = (line: LineForm) => line;

  private readonly productList = toSignal(
    this.dropdowns.products('inventory').pipe(
      catchError((error: unknown) => {
        this.notification.error('Could not load products', apiErrorMessage(error));
        return of([]);
      }),
    ),
    { initialValue: [] },
  );
  /** Products of a loaded adjustment, which the active-only dropdown may no longer list. */
  private readonly savedProducts = signal<DropdownItem[]>([]);
  readonly productOptions = computed(() => withMissing(this.productList(), this.savedProducts()));

  /** Batch picker options by product id. */
  private readonly batchOptions = computed(
    () => new Map([...this.lookup.batches()].map(([id, batches]) => [id, batchOptions(batches)])),
  );

  constructor() {
    const id = this.id();
    if (this.mode() !== 'add' && id) {
      this.load(id);
    } else {
      this.mode.set('add');
      this.addLine();
      this.adjustmentService
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

  /** Picks the product's first batch in stock (earliest expiry). */
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
    if (this.saving() || this.loading()) return;

    if (!this.lines().length) {
      this.notification.warn('No products', 'Add at least one product to the adjustment.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warn('Missing details', 'Fill in the fields highlighted in red.');
      return;
    }

    // Required fields are checked above, so the non-null assertions hold.
    const value = this.form.getRawValue();
    const payload: StockAdjustmentPayload = {
      date: toIsoDate(value.date!),
      remarks: value.remarks.trim() || null,
      stockAdjustmentEntries: value.lines.map(line => ({
        // Lines keep their id so the update edits them instead of replacing them.
        id: line.id ?? undefined,
        product_id: line.product_id!,
        batch_id: line.batch_id!,
        adjustment_type: line.adjustment_type!,
        quantity: line.quantity!,
        reason: line.reason.trim() || null,
      })),
    };

    const id = this.id();
    const editing = this.mode() === 'edit' && id !== undefined;
    const request = editing ? this.adjustmentService.update(id, payload) : this.adjustmentService.create(payload);

    this.saving.set(true);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success(editing ? 'Stock adjustment updated' : 'Stock adjustment added', response.message);
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

  /** The lines as a CSV file. */
  exportLines() {
    const docNo = new DocNoPipe().transform(this.entryNo()) || 'stock-adjustment';
    const types = new Map(ADJUSTMENT_TYPES.map(type => [type.value, type.label]));
    downloadCsv(docNo.replace(/[^\w-]+/g, '-'), [
      ['S.N', 'Product', 'Code', 'Unit', 'Batch', 'Expiry Date', 'Type', 'Quantity', 'Reason'],
      ...this.lines().map((line, index) => {
        const value = line.getRawValue();
        const product = this.productOf(line);
        const name = this.productOptions().find(option => option.id === value.product_id)?.name;
        return [
          index + 1,
          name ?? product?.name,
          product?.code,
          product?.unit_name,
          this.batchLabel(line),
          this.batchOf(line)?.expiry_date ?? '',
          value.adjustment_type ? types.get(value.adjustment_type) : '',
          value.quantity,
          value.reason,
        ];
      }),
    ]);
  }

  private load(id: number) {
    this.loading.set(true);
    this.adjustmentService
      .get(id)
      .pipe(
        // Product details and batches first, so code, unit and expiry show with the lines.
        switchMap(saved =>
          this.loadLineProducts(saved.stockAdjustmentEntries ?? []).pipe(map(() => saved)),
        ),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: saved => this.fill(saved),
        error: (error: unknown) => {
          this.notification.error('Could not load the stock adjustment', apiErrorMessage(error));
          this.close();
        },
      });
  }

  private fill(saved: StockAdjustment) {
    const entries = saved.stockAdjustmentEntries ?? [];
    this.entryNo.set(saved.system_entry_no);
    this.savedProducts.set(entries.map(line => ({ id: line.product_id, name: line.product_name ?? '' })));

    const lines = entries.map(line => this.createLine(line));
    const array = this.form.controls.lines;
    array.clear({ emitEvent: false });
    lines.forEach(line => array.push(line, { emitEvent: false }));
    this.lines.set(lines);

    this.form.patchValue({
      date: fromIsoDate(saved.date),
      remarks: saved.remarks ?? '',
    });
    this.form.markAsPristine();
  }

  /** With no stock info, the default batch. */
  private useBatch(line: LineForm, batch: BatchStock | undefined) {
    line.patchValue({
      batch_id: batch?.batch_id ?? 0,
      batch_no: batch?.batch_no ?? null,
    });
  }

  private createLine(line?: StockAdjustmentLine): LineForm {
    return this.fb.group({
      id: this.fb.control<number | null>(line?.id ?? null),
      product_id: this.fb.control<number | null>(line?.product_id ?? null, Validators.required),
      batch_id: this.fb.control<number | null>(line?.batch_id ?? null, Validators.required),
      batch_no: this.fb.control<string | null>(line?.batch_no ?? null),
      adjustment_type: this.fb.control<AdjustmentType | null>(line?.adjustment_type ?? null, Validators.required),
      quantity: this.fb.control<number | null>(line?.quantity ?? null, [
        Validators.required,
        Validators.min(0.001),
      ]),
      reason: this.fb.control(line?.reason ?? ''),
    });
  }

  /** Details and batches of the lines' products. */
  private loadLineProducts(lines: { product_id: number }[]): Observable<unknown> {
    const ids = lines.map(line => line.product_id);
    return forkJoin([this.lookup.loadProducts(ids), this.lookup.loadBatches(ids)]);
  }
}
