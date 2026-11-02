import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Card, Select } from '@lumen-ui/angular';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { TrendInterval } from '../dashboard.model';
import { DashboardService } from '../dashboard.service';
import { TREND_INTERVALS, pointLabels } from '../figures';
import { ChartSeries, LineChart } from '../line-chart/line-chart';

interface TrendLine {
  name: string;
  color: string;
  key: 'purchase' | 'sales';
  operation: string;
}

const LINES: TrendLine[] = [
  { name: 'Purchase', color: 'var(--chart-1)', key: 'purchase', operation: 'ViewPurchaseEntry' },
  { name: 'Sales', color: 'var(--accent)', key: 'sales', operation: 'ViewSalesEntries' },
];

/** What the chart draws; labels and values are set together so they always match. */
interface TrendChart {
  labels: string[];
  titles: string[];
  series: ChartSeries[];
}

/**
 * Purchases against sales (grand totals) by day, week or month, from
 * `GET /dashboard/purchase-vs-sales`; each line needs its View permission.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, FormsModule, LineChart, Select],
  selector: 'app-trend-card',
  styleUrls: ['../dashboard-card.scss', './trend-card.scss'],
  templateUrl: './trend-card.html',
})
export class TrendCard {
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);

  readonly intervals = TREND_INTERVALS;
  readonly interval = signal<TrendInterval>('monthly');
  readonly lines = computed(() => LINES.filter(line => this.auth.hasOperation(line.operation)));

  readonly chart = signal<TrendChart>({ labels: [], titles: [], series: [] });
  readonly loading = signal(true);
  readonly loadError = signal('');

  constructor() {
    const request = computed(() => ({ interval: this.interval(), lines: this.lines() }));

    toObservable(request)
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(({ interval, lines }) =>
          this.dashboard.purchaseVsSales(interval).pipe(
            map(({ points }) => {
              const labels = points.map(point => pointLabels(interval, point));
              return {
                chart: {
                  labels: labels.map(label => label.label),
                  titles: labels.map(label => label.title),
                  series: lines.map(line => ({
                    name: line.name,
                    color: line.color,
                    values: points.map(point => point[line.key] ?? 0),
                  })),
                },
                error: '',
              };
            }),
            catchError((error: unknown) =>
              of({ chart: null, error: apiErrorMessage(error, 'Could not load purchases and sales.') }),
            ),
          ),
        ),
        takeUntilDestroyed(),
      )
      // The last chart stays, faded, while the next interval loads.
      .subscribe(({ chart, error }) => {
        this.loading.set(false);
        this.loadError.set(error);
        if (chart) this.chart.set(chart);
      });
  }
}
