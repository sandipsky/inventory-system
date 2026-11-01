import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Button,
  Card,
  DRAWER_DATA,
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
import { Observable, catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { DropdownItem } from '../../../shared/models/api.model';
import { BonusInfo, ProductDetail, ProductPayload } from '../../../shared/models/product.model';
import { DropdownService } from '../../../shared/services/dropdown.service';
import { ProductService } from '../../../shared/services/product.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { withMissing } from '../../../shared/utils/options';
import { ProductFormData, ProductFormMode, VALUATION_METHODS } from '../product.model';

const HEADINGS: Record<ProductFormMode, { title: string; subtitle: string; icon: IconName }> = {
  add: {
    title: 'Add Product',
    subtitle: 'Provide essential details to create a product',
    icon: 'add',
  },
  edit: {
    title: 'Edit Product',
    subtitle: 'Update the details of this product',
    icon: 'edit',
  },
  view: {
    title: 'Product',
    subtitle: 'Details of this product',
    icon: 'eye',
  },
};

const BONUS_COLUMNS: TableColumn[] = [
  { key: 'sn', header: 'S.N', width: '48px' },
  { key: 'min_quantity', header: 'Min. Quantity' },
  { key: 'bonus_quantity', header: 'Bonus Quantity' },
  { key: 'actions', header: '', width: '44px', align: 'center' },
];

/** One bonus rule row: buy at least `min_quantity`, get `bonus_quantity` free. */
type BonusForm = FormGroup<{
  min_quantity: FormControl<number | null>;
  bonus_quantity: FormControl<number | null>;
}>;

/**
 * Product form, opened in a near full-screen bottom drawer from the list in one of three
 * modes (see ProductFormData). The drawer ref and data are optional so the component also
 * renders inline (e.g. in tests), defaulting to `add`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Button,
    Card,
    Icon,
    NumberInput,
    ReactiveFormsModule,
    Select,
    Skeleton,
    Table,
    TableCellDirective,
    TextInput,
    Textarea,
    Toggle,
  ],
  selector: 'app-product-form',
  styleUrl: './product-form.scss',
  templateUrl: './product-form.html',
})
export class ProductForm {
  private readonly drawerRef = inject<DrawerRef<ProductForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<ProductFormData | null>(DRAWER_DATA, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dropdowns = inject(DropdownService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notification = inject(NotificationService);
  private readonly productService = inject(ProductService);

  readonly mode = signal<ProductFormMode>(this.data?.mode ?? 'add');
  readonly id = signal<number | undefined>(this.data?.id);

  readonly heading = computed(() => HEADINGS[this.mode()]);
  readonly title = computed(() => this.heading().title);
  readonly readonly = computed(() => this.mode() === 'view');
  readonly canEdit = computed(() => this.auth.hasOperation('EditProduct'));
  readonly bonusColumns = computed(() =>
    this.readonly() ? BONUS_COLUMNS.filter(column => column.key !== 'actions') : BONUS_COLUMNS,
  );

  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    name: this.fb.control('', Validators.required),
    code: this.fb.control(''),
    barcode: this.fb.control(''),
    category_id: this.fb.control<number | null>(null),
    unit_id: this.fb.control<number | null>(null, Validators.required),
    packing_id: this.fb.control<number | null>(null),
    tax_type_id: this.fb.control<number | null>(null),
    valuation_method: this.fb.control<string | null>(VALUATION_METHODS[0], Validators.required),
    cost_price: this.fb.control<number | null>(null, Validators.min(0)),
    selling_price: this.fb.control<number | null>(null, Validators.min(0)),
    mrp: this.fb.control<number | null>(null, Validators.min(0)),
    min_stock: this.fb.control<number | null>(null, Validators.min(0)),
    max_stock: this.fb.control<number | null>(null, Validators.min(0)),
    is_active: this.fb.control(true),
    purchasable: this.fb.control(true),
    sellable: this.fb.control(true),
    service_item: this.fb.control(false),
    is_batch_available: this.fb.control(false),
    has_expiry_date: this.fb.control(false),
    has_manufacturing_date: this.fb.control(false),
    remarks: this.fb.control(''),
    bonus_infos: this.fb.array<BonusForm>([]),
  });

  /** The bonus rows as a signal, so the table re-renders when one is added or removed. */
  readonly bonuses = signal<BonusForm[]>([]);
  readonly trackBonus = (bonus: BonusForm) => bonus;

  private readonly categoryList = toSignal(this.dropdown(this.dropdowns.categories(), 'categories'), {
    initialValue: [],
  });
  private readonly unitList = toSignal(this.dropdown(this.dropdowns.units(), 'units'), { initialValue: [] });
  private readonly packingList = toSignal(this.dropdown(this.dropdowns.packings(), 'packings'), {
    initialValue: [],
  });
  private readonly taxTypeList = toSignal(this.dropdown(this.dropdowns.taxTypes(), 'tax types'), {
    initialValue: [],
  });
  /** Choices of a loaded product, which the active-only dropdowns may no longer list. */
  private readonly saved = signal<{
    category: DropdownItem[];
    unit: DropdownItem[];
    packing: DropdownItem[];
    taxType: DropdownItem[];
    valuation: string | null;
  }>({ category: [], unit: [], packing: [], taxType: [], valuation: null });

  readonly categoryOptions = computed(() => withMissing(this.categoryList(), this.saved().category));
  readonly unitOptions = computed(() => withMissing(this.unitList(), this.saved().unit));
  readonly packingOptions = computed(() => withMissing(this.packingList(), this.saved().packing));
  readonly taxTypeOptions = computed(() => withMissing(this.taxTypeList(), this.saved().taxType));
  readonly valuationOptions = computed(() => {
    const valuation = this.saved().valuation;
    return valuation && !VALUATION_METHODS.includes(valuation) ? [...VALUATION_METHODS, valuation] : VALUATION_METHODS;
  });

  constructor() {
    const id = this.id();
    if (this.mode() !== 'add' && id) {
      this.load(id);
    } else {
      this.mode.set('add');
    }
  }

  serial(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  addBonus() {
    const bonus = this.createBonus();
    this.form.controls.bonus_infos.push(bonus);
    this.bonuses.update(bonuses => [...bonuses, bonus]);
  }

  removeBonus(bonus: BonusForm) {
    const index = this.form.controls.bonus_infos.controls.indexOf(bonus);
    if (index < 0) return;
    this.form.controls.bonus_infos.removeAt(index);
    this.bonuses.update(bonuses => bonuses.filter(item => item !== bonus));
  }

  startEdit() {
    this.mode.set('edit');
  }

  save() {
    if (this.saving() || this.loading()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warn('Missing details', 'Fill in the fields highlighted in red.');
      return;
    }

    const value = this.form.getRawValue();
    if (value.min_stock !== null && value.max_stock !== null && value.min_stock > value.max_stock) {
      this.notification.warn('Check stock limits', 'Minimum stock cannot be more than maximum stock.');
      return;
    }

    // Required fields are checked above, so the non-null assertions hold.
    const payload: ProductPayload = {
      name: value.name.trim(),
      code: value.code.trim() || null,
      barcode: value.barcode.trim() || null,
      category_id: value.category_id,
      unit_id: value.unit_id!,
      packing_id: value.packing_id,
      tax_type_id: value.tax_type_id,
      valuation_method: value.valuation_method!,
      cost_price: value.cost_price,
      selling_price: value.selling_price,
      mrp: value.mrp,
      min_stock: value.min_stock,
      max_stock: value.max_stock,
      is_active: value.is_active,
      purchasable: value.purchasable,
      sellable: value.sellable,
      service_item: value.service_item,
      is_batch_available: value.is_batch_available,
      has_expiry_date: value.has_expiry_date,
      has_manufacturing_date: value.has_manufacturing_date,
      remarks: value.remarks.trim() || null,
      bonus_infos: value.bonus_infos.map(bonus => ({
        min_quantity: bonus.min_quantity!,
        bonus_quantity: bonus.bonus_quantity!,
      })),
    };

    const id = this.id();
    const editing = this.mode() === 'edit' && id !== undefined;
    const request = editing ? this.productService.update(id, payload) : this.productService.create(payload);

    this.saving.set(true);
    request
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success(editing ? 'Product updated' : 'Product added', response.message);
          this.drawerRef?.close(true);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  close() {
    this.drawerRef?.close(false);
  }

  private load(id: number) {
    this.loading.set(true);
    this.productService
      .get(id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: product => this.fill(product),
        error: (error: unknown) => {
          this.notification.error('Could not load the product', apiErrorMessage(error));
          this.close();
        },
      });
  }

  private fill(product: ProductDetail) {
    this.saved.set({
      category: option(product.category_id, product.category_name),
      unit: option(product.unit_id, product.unit_name),
      packing: option(product.packing_id, product.packing_name),
      taxType: option(product.tax_type_id, product.tax_type_name),
      valuation: product.valuation_method,
    });

    const bonuses = product.bonus_infos.map(bonus => this.createBonus(bonus));
    const array = this.form.controls.bonus_infos;
    array.clear({ emitEvent: false });
    bonuses.forEach(bonus => array.push(bonus, { emitEvent: false }));
    this.bonuses.set(bonuses);

    this.form.patchValue({
      name: product.name,
      code: product.code ?? '',
      barcode: product.barcode ?? '',
      category_id: product.category_id,
      // `0` means the product has no unit (only possible for old data).
      unit_id: product.unit_id || null,
      packing_id: product.packing_id,
      tax_type_id: product.tax_type_id,
      valuation_method: product.valuation_method,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      mrp: product.mrp,
      min_stock: product.min_stock,
      max_stock: product.max_stock,
      is_active: product.is_active,
      purchasable: product.purchasable,
      sellable: product.sellable,
      service_item: product.service_item,
      is_batch_available: product.is_batch_available,
      has_expiry_date: product.has_expiry_date,
      has_manufacturing_date: product.has_manufacturing_date,
      remarks: product.remarks ?? '',
    });
    this.form.markAsPristine();
  }

  private createBonus(bonus?: BonusInfo): BonusForm {
    return this.fb.group({
      min_quantity: this.fb.control<number | null>(bonus?.min_quantity ?? null, [
        Validators.required,
        Validators.min(0.001),
      ]),
      bonus_quantity: this.fb.control<number | null>(bonus?.bonus_quantity ?? null, [
        Validators.required,
        Validators.min(0.001),
      ]),
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

/** The saved choice as a one-item option list, or none when the product has no such link. */
function option(id: number | null, name: string | null): DropdownItem[] {
  return id ? [{ id, name: name ?? '' }] : [];
}
