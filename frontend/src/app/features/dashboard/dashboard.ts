import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Icon } from '@lumen-ui/angular';
import { AuthService } from '../../auth/auth.service';
import { BalanceCards } from './balance-cards/balance-cards';
import { NearExpiryCard } from './near-expiry-card/near-expiry-card';
import { StockInfoCard } from './stock-info-card/stock-info-card';
import { TotalsCard } from './totals-card/totals-card';
import { TrendCard } from './trend-card/trend-card';

/**
 * Balances, purchases against sales, sales and purchase totals, near-expiry batches and low stock,
 * from the `/dashboard` endpoints. A card shows only when the role may view what it sums.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BalanceCards, Icon, NearExpiryCard, StockInfoCard, TotalsCard, TrendCard],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly auth = inject(AuthService);

  readonly showBalances = computed(() => this.auth.hasOperation('ViewAccount'));
  readonly showTrend = computed(() => this.auth.hasOperation(['ViewPurchaseEntry', 'ViewSalesEntries']));
  readonly showSales = computed(() => this.auth.hasOperation(['ViewSalesEntries', 'ViewSalesReturns']));
  readonly showPurchases = computed(() => this.auth.hasOperation(['ViewPurchaseEntry', 'ViewPurchaseReturn']));
  /** Near expiry and stock information. */
  readonly showStock = computed(() => this.auth.hasOperation('ViewStockEdit'));

  readonly hasMain = computed(() => this.showBalances() || this.showTrend());
  readonly hasSide = computed(() => this.showSales() || this.showPurchases());
}
