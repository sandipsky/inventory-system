import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  Button,
  Chip,
  ConfirmDialog,
  ConfirmDialogData,
  DrawerService,
  Filter,
  FilterChange,
  FilterColumn,
  Icon,
  Menu,
  ModalService,
  NotificationService,
  Pagination,
  Table,
  TableCellDirective,
  TableColumn,
  TableSort,
} from '@lumen-ui/angular';
import { Observable, catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { LIST_PAGE_CARD } from '../../../shared/components/list-page-card/list-page-card';
import { DropdownItem, ListParams } from '../../../shared/models/api.model';
import { ProductDetail } from '../../../shared/models/product.model';
import { AmountPipe } from '../../../shared/pipes/amount.pipe';
import { DropdownService } from '../../../shared/services/dropdown.service';
import { ProductService } from '../../../shared/services/product.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { downloadCsv } from '../../../shared/utils/csv';
import { toIsoDate } from '../../../shared/utils/date';
import { ProductFormData, ProductFormMode } from '../product.model';
import { ProductForm } from '../product-form/product-form';

/** Table column key → backend sort field (entity names, see backend/endpoints.md). */
const SORT_FIELDS: Record<string, string> = {
  category_name: 'category.name',
  unit_name: 'unit.name',
  tax_type_name: 'taxType.name',
  cost_price: 'costPrice',
  selling_price: 'sellingPrice',
  is_active: 'isActive',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountPipe, Button, Chip, Filter, Icon, LIST_PAGE_CARD, Menu, Pagination, Table, TableCellDirective],
  selector: 'app-product-list',
  styleUrl: './product-list.scss',
  templateUrl: './product-list.html',
})
export class ProductList {
  private readonly auth = inject(AuthService);
  private readonly drawer = inject(DrawerService);
  private readonly dropdowns = inject(DropdownService);
  private readonly modal = inject(ModalService);
  private readonly notification = inject(NotificationService);
  private readonly productService = inject(ProductService);

  readonly canCreate = computed(() => this.auth.hasOperation('CreateProduct'));
  readonly canEdit = computed(() => this.auth.hasOperation('EditProduct'));
  readonly canDelete = computed(() => this.auth.hasOperation('DeleteProduct'));

  private readonly categories = toSignal(quiet(this.dropdowns.categories('all')), { initialValue: [] });
  private readonly units = toSignal(quiet(this.dropdowns.units('all')), { initialValue: [] });

  // Field keys are the backend's camelCase filter names (see backend/endpoints.md). Filters match
  // by "contains", so category and unit filter on the name (id 1 would also match 10, 11, …), and
  // booleans, stored as 1/0, send those.
  readonly filterColumns = computed<FilterColumn[]>(() => [
    { name: 'Code', formcontrolName: 'code', type: 'text' },
    { name: 'Barcode', formcontrolName: 'barcode', type: 'text' },
    { name: 'Category', formcontrolName: 'category.name', type: 'select', data: byName(this.categories()) },
    { name: 'Unit', formcontrolName: 'unit.name', type: 'select', data: byName(this.units()) },
    {
      name: 'Product Type',
      formcontrolName: 'productType',
      type: 'select',
      data: [
        { id: 'purchasable', name: 'Purchasable' },
        { id: 'sellable', name: 'Sellable' },
        { id: 'both', name: 'Purchasable & Sellable' },
      ],
    },
    {
      name: 'Item Type',
      formcontrolName: 'isServiceItem',
      type: 'select',
      data: [
        { id: '0', name: 'Inventory' },
        { id: '1', name: 'Service' },
      ],
    },
    {
      name: 'Status',
      formcontrolName: 'isActive',
      type: 'select',
      data: [
        { id: '1', name: 'Active' },
        { id: '0', name: 'Inactive' },
      ],
    },
  ]);

  readonly columns: TableColumn[] = [
    { key: 'sn', header: 'S.N', width: '56px' },
    { key: 'name', header: 'Product Name/Code', sortable: true },
    { key: 'category_name', header: 'Category', sortable: true },
    { key: 'unit_name', header: 'Unit', sortable: true },
    { key: 'tax_type_name', header: 'Tax Type', sortable: true },
    { key: 'product_types', header: 'Type' },
    { key: 'cost_price', header: 'Cost Price', sortable: true, align: 'right' },
    { key: 'selling_price', header: 'Selling Price', sortable: true, align: 'right' },
    { key: 'mrp', header: 'MRP', sortable: true, align: 'right' },
    { key: 'is_active', header: 'Status', sortable: true },
    { key: 'actions', header: '', width: '56px', align: 'center' },
  ];

  readonly filters = signal<FilterChange[]>([]);
  readonly sort = signal<TableSort | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly rows = signal<ProductDetail[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly exporting = signal(false);
  /** Bumped to refetch the current page, e.g. after a save or delete. */
  private readonly refresh = signal(0);

  readonly emptyText = computed(() => this.loadError() || 'No products found for these filters.');

  /** Filters and sort, without paging; shared by the table and the export. */
  private readonly query = computed(() => {
    const params: ListParams = {};
    for (const filter of this.filters()) {
      params[filter.field] = filter.value;
    }
    const sort = this.sort();
    params['sort'] = sort ? `${SORT_FIELDS[sort.key] ?? sort.key}:${sort.direction}` : 'id:desc';
    return params;
  });

  constructor() {
    const request = computed(() => ({
      params: { ...this.query(), pageIndex: this.pageIndex(), pageSize: this.pageSize() },
      refresh: this.refresh(),
    }));

    toObservable(request)
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(({ params }) =>
          this.productService.list(params).pipe(
            map(page => ({ page, error: '' })),
            catchError((error: unknown) =>
              of({ page: null, error: apiErrorMessage(error, 'Could not load products.') }),
            ),
          ),
        ),
        takeUntilDestroyed(),
      )
      // Rows stay on screen while the next page loads, so the table doesn't flash empty.
      .subscribe(({ page, error }) => {
        this.loading.set(false);
        this.loadError.set(error);
        this.rows.set(page?.content ?? []);
        this.total.set(page?.totalElements ?? 0);
      });
  }

  onFilterChange(filters: FilterChange[]) {
    this.filters.set(filters);
    this.pageIndex.set(0);
  }

  resetPage() {
    this.pageIndex.set(0);
  }

  /** Two-digit running number across pages: 01, 02, … */
  serial(index: number): string {
    return String(this.pageIndex() * this.pageSize() + index + 1).padStart(2, '0');
  }

  /** Opens the product form in a near full-screen bottom drawer. `id` is required for edit and view. */
  openForm(mode: ProductFormMode, id?: number) {
    const ref = this.drawer.open<ProductForm, ProductFormData, boolean>(ProductForm, {
      data: { mode, id },
      position: 'bottom',
      size: 'calc(100vh - 48px)',
      panelClass: 'drawer-sheet',
      // Only the form's own buttons close it, so a stray backdrop click never throws away edits
      // (view mode can switch to edit in place).
      disableClose: true,
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) this.reload();
    });
  }

  remove(row: ProductDetail) {
    this.modal
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        width: '420px',
        data: {
          title: 'Delete product?',
          message: `"${row.name}" will be deleted. This cannot be undone.`,
          confirmText: 'Delete',
          confirmVariant: 'danger',
          onConfirm: () =>
            this.productService.delete(row.id).pipe(
              tap({
                error: (error: unknown) =>
                  this.notification.error('Could not delete', apiErrorMessage(error)),
              }),
            ),
        },
      })
      .afterClosed()
      .subscribe(deleted => {
        if (!deleted) return;
        this.notification.success('Product deleted', `"${row.name}" was deleted.`);
        // Step back when the last row of a page goes, so the pager isn't left on an empty page.
        if (this.rows().length === 1 && this.pageIndex() > 0) this.pageIndex.update(i => i - 1);
        else this.reload();
      });
  }

  reload() {
    this.refresh.update(n => n + 1);
  }

  print() {
    window.print();
  }

  /** Every product matching the filters (not just this page) as a CSV file. */
  exportList() {
    if (this.exporting()) return;
    this.exporting.set(true);
    const pageSize = Math.max(this.total(), 1);

    this.productService
      .list({ ...this.query(), pageIndex: 0, pageSize })
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: page => {
          downloadCsv(`products-${toIsoDate(new Date())}`, [
            ['S.N', 'Product Name', 'Code', 'Barcode', 'Category', 'Unit', 'Packing', 'Tax Type', 'Type',
              'Cost Price', 'Selling Price', 'MRP', 'Min Stock', 'Max Stock', 'Status'],
            ...page.content.map((row, i) => [
              i + 1,
              row.name,
              row.code,
              row.barcode,
              row.category_name,
              row.unit_name,
              row.packing_name,
              row.tax_type_name,
              this.typesOf(row).join(' / '),
              row.cost_price,
              row.selling_price,
              row.mrp,
              row.min_stock,
              row.max_stock,
              row.is_active ? 'Active' : 'Inactive',
            ]),
          ]);
        },
        error: (error: unknown) => this.notification.error('Export failed', apiErrorMessage(error)),
      });
  }

  /** `Service` for service items, then `Purchasable` and/or `Sellable`. */
  typesOf(row: ProductDetail): string[] {
    return row.service_item ? ['Service', ...row.product_types] : row.product_types;
  }
}

/** A dropdown whose failure only leaves its filter without options. */
function quiet(source: Observable<DropdownItem[]>): Observable<DropdownItem[]> {
  return source.pipe(catchError(() => of([])));
}

/** Select options that report the name as the filter value. */
function byName(items: DropdownItem[]): { id: string; name: string }[] {
  return items.map(item => ({ id: item.name, name: item.name }));
}
