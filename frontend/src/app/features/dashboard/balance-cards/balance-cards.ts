import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Card, Icon, IconName, Skeleton } from '@lumen-ui/angular';
import { AmountPipe } from '../../../shared/pipes/amount.pipe';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { BalanceSummary } from '../dashboard.model';
import { DashboardService } from '../dashboard.service';
import { percentChange } from '../figures';

interface OutstandingItem {
  key: 'payables' | 'receivables';
  weekAgo: 'payables_week_ago' | 'receivables_week_ago';
  label: string;
  icon: IconName;
  tone: string;
  /** Whether a rise is good news, which colors the weekly change. */
  riseIsGood: boolean;
}

const OUTSTANDING: OutstandingItem[] = [
  { key: 'payables', weekAgo: 'payables_week_ago', label: 'Outstanding Payables', icon: 'moneys', tone: 'info', riseIsGood: false },
  {
    key: 'receivables',
    weekAgo: 'receivables_week_ago',
    label: 'Outstanding Receivables',
    icon: 'savings',
    tone: 'premium',
    riseIsGood: true,
  },
];

/**
 * The top row: the cash balance, and what is owed to vendors and by customers with the change
 * since a week ago (`GET /dashboard/balances`, which needs `ViewAccount`).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountPipe, Card, DecimalPipe, Icon, Skeleton],
  selector: 'app-balance-cards',
  styleUrls: ['../dashboard-card.scss', './balance-cards.scss'],
  templateUrl: './balance-cards.html',
})
export class BalanceCards {
  private readonly dashboard = inject(DashboardService);

  readonly summary = signal<BalanceSummary | null>(null);
  readonly loadError = signal('');

  readonly outstanding = computed(() => {
    const summary = this.summary();
    return OUTSTANDING.map(item => {
      const change = summary ? percentChange(summary[item.key], summary[item.weekAgo]) : null;
      const rounded = change === null ? null : Math.round(change);
      return {
        ...item,
        amount: summary?.[item.key] ?? null,
        change: rounded,
        trend: !rounded ? 'flat' : rounded > 0 === item.riseIsGood ? 'good' : 'bad',
      };
    });
  });

  constructor() {
    this.dashboard
      .balances()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: summary => this.summary.set(summary),
        error: (error: unknown) => this.loadError.set(apiErrorMessage(error, 'Could not load account balances.')),
      });
  }
}
