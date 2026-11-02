import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Card, Icon, IconName, Select, Skeleton } from '@lumen-ui/angular';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { AmountPipe } from '../../../shared/pipes/amount.pipe';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { DateRange, MONTH_OPTIONS, PurchaseSummary, SalesSummary } from '../dashboard.model';
import { DashboardService } from '../dashboard.service';
import { lastMonths } from '../figures';

type Totals = Partial<SalesSummary & PurchaseSummary>;

interface TotalTile {
  label: string;
  field: keyof Totals;
  /** Every one is needed to see the figure. */
  operations: string[];
  icon: IconName;
  tone: string;
}

interface TotalsConfig {
  title: string;
  subtitle: string;
  tiles: TotalTile[];
}

export type TotalsKind = 'sales' | 'purchase';

const TOTALS: Record<TotalsKind, TotalsConfig> = {
  sales: {
    title: 'Sales Summary',
    subtitle: 'Overview of sales activity.',
    tiles: [
      { label: 'Total Sales', field: 'total_sales', operations: ['ViewSalesEntries'], icon: 'bar_chart', tone: 'success' },
      { label: 'Total Sales Return', field: 'total_sales_return', operations: ['ViewSalesReturns'], icon: 'undo', tone: 'warn' },
      {
        label: 'Net Sales',
        field: 'net_sales',
        operations: ['ViewSalesEntries', 'ViewSalesReturns'],
        icon: 'receipt',
        tone: 'premium',
      },
    ],
  },
  purchase: {
    title: 'Purchase Summary',
    subtitle: 'Overview of purchase activity.',
    tiles: [
      { label: 'Total Purchase', field: 'total_purchase', operations: ['ViewPurchaseEntry'], icon: 'cart', tone: 'info' },
      {
        label: 'Total Purchase Return',
        field: 'total_purchase_return',
        operations: ['ViewPurchaseReturn'],
        icon: 'cart_return',
        tone: 'success',
      },
    ],
  },
};

/**
 * Grand totals of sales or purchases and their returns over the last few months, cancelled
 * documents left out (`GET /dashboard/sales-summary`, `/purchase-summary`). A tile shows only
 * with the View permissions behind it.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountPipe, Card, FormsModule, Icon, Select, Skeleton],
  selector: 'app-totals-card',
  styleUrls: ['../dashboard-card.scss', './totals-card.scss'],
  templateUrl: './totals-card.html',
})
export class TotalsCard {
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);

  readonly kind = input.required<TotalsKind>();

  readonly monthOptions = MONTH_OPTIONS;
  readonly months = signal(6);

  readonly config = computed(() => TOTALS[this.kind()]);
  private readonly tiles = computed(() =>
    this.config().tiles.filter(tile => tile.operations.every(operation => this.auth.hasOperation(operation))),
  );

  /** `null` until loaded. */
  readonly totals = signal<Totals | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');

  readonly figures = computed(() => {
    const totals = this.totals();
    return this.tiles().map(tile => ({ ...tile, value: totals?.[tile.field] ?? null }));
  });

  constructor() {
    const request = computed(() => ({ kind: this.kind(), range: lastMonths(this.months()) }));

    toObservable(request)
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(({ kind, range }) =>
          this.summary(kind, range).pipe(
            map(totals => ({ totals, error: '' })),
            catchError((error: unknown) => of({ totals: null, error: apiErrorMessage(error, 'Could not load the totals.') })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ totals, error }) => {
        this.loading.set(false);
        this.loadError.set(error);
        this.totals.set(totals);
      });
  }

  private summary(kind: TotalsKind, range: DateRange): Observable<Totals> {
    return kind === 'sales' ? this.dashboard.salesSummary(range) : this.dashboard.purchaseSummary(range);
  }
}
