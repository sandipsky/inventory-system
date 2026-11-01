import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Button,
  CalendarSystem,
  DRAWER_DATA,
  DateInput,
  DrawerRef,
  Icon,
  NotificationService,
  NumberInput,
  Select,
  TextInput,
} from '@lumen-ui/angular';
import { catchError, finalize, of } from 'rxjs';
import { DropdownService } from '../../../../shared/services/dropdown.service';
import { ProductService } from '../../../../shared/services/product.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { toIsoDate } from '../../../../shared/utils/date';
import { OpeningStockFormData, OpeningStockPayload } from '../../inventory.model';
import { OpeningStockService } from '../../opening-stock.service';

/**
 * Adds the opening stock of one product batch, in a right drawer opened from OpeningStockList.
 * Picking a product fills in its prices. Closes with `true` once saved.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DateInput, Icon, NumberInput, ReactiveFormsModule, Select, TextInput],
  selector: 'app-opening-stock-form',
  styleUrl: './opening-stock-form.scss',
  templateUrl: './opening-stock-form.html',
})
export class OpeningStockForm {
  private readonly drawerRef = inject<DrawerRef<OpeningStockForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<OpeningStockFormData | null>(DRAWER_DATA, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly dropdowns = inject(DropdownService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notification = inject(NotificationService);
  private readonly productService = inject(ProductService);
  private readonly stockService = inject(OpeningStockService);

  readonly calendar: CalendarSystem = this.data?.calendar ?? 'bs';

  readonly saving = signal(false);

  readonly form = this.fb.group({
    product_id: this.fb.control<number | null>(null, Validators.required),
    batch_no: this.fb.control(''),
    expiry_date: this.fb.control<Date | null>(null),
    quantity: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    cost_price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    selling_price: this.fb.control<number | null>(null, Validators.min(0)),
    mrp: this.fb.control<number | null>(null, Validators.min(0)),
  });

  readonly productOptions = toSignal(
    this.dropdowns.products('inventory').pipe(
      catchError((error: unknown) => {
        this.notification.error('Could not load products', apiErrorMessage(error));
        return of([]);
      }),
    ),
    { initialValue: [] },
  );

  /** Fills in the picked product's prices. Without access to the product, they stay as typed. */
  onProductChange(productId: unknown) {
    if (typeof productId !== 'number') return;
    this.productService
      .get(productId)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(product => {
        if (!product || this.form.controls.product_id.value !== productId) return;
        this.form.patchValue({
          cost_price: product.cost_price,
          selling_price: product.selling_price,
          mrp: product.mrp,
        });
      });
  }

  save() {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warn('Missing details', 'Fill in the fields highlighted in red.');
      return;
    }

    // Required fields are checked above, so the non-null assertions hold.
    const value = this.form.getRawValue();
    const payload: OpeningStockPayload = {
      product_id: value.product_id!,
      batch_no: value.batch_no.trim() || null,
      expiry_date: value.expiry_date ? toIsoDate(value.expiry_date) : null,
      quantity: value.quantity!,
      cost_price: value.cost_price!,
      selling_price: value.selling_price ?? 0,
      mrp: value.mrp ?? 0,
    };

    this.saving.set(true);
    this.stockService
      .create(payload)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.notification.success('Opening stock added', response.message);
          this.drawerRef?.close(true);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  close() {
    this.drawerRef?.close(false);
  }
}
