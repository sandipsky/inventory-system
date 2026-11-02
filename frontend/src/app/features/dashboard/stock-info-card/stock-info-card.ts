import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Card, SegmentedControl, SegmentedOption, Table, TableCellDirective, TableColumn } from '@lumen-ui/angular';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { StockAlerts } from '../dashboard.model';
import { DashboardService } from '../dashboard.service';

type StockTab = 'low' | 'zero';

/**
 * Active products at or below their minimum stock, or with none left, every batch added up
 * (`GET /dashboard/stock-alerts`, which needs `ViewStockEdit`).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, DecimalPipe, FormsModule, SegmentedControl, Table, TableCellDirective],
  selector: 'app-stock-info-card',
  styleUrls: ['../dashboard-card.scss', './stock-info-card.scss'],
  templateUrl: './stock-info-card.html',
})
export class StockInfoCard {
  private readonly dashboard = inject(DashboardService);

  readonly tabs: SegmentedOption[] = [
    { label: 'Minimum Stock', value: 'low' },
    { label: 'Zero Quantity', value: 'zero' },
  ];
  readonly tab = signal<StockTab>('low');

  readonly alerts = signal<StockAlerts | null>(null);
  readonly loaded = signal(false);
  readonly loadError = signal('');

  readonly rows = computed(() => {
    const alerts = this.alerts();
    return (this.tab() === 'low' ? alerts?.minimum_stock : alerts?.zero_quantity) ?? [];
  });

  readonly columns = computed<TableColumn[]>(() => [
    { key: 'product_name', header: 'Product Name' },
    ...(this.tab() === 'low' ? [{ key: 'min_stock', header: 'Min. Stock', align: 'right' } as const] : []),
    { key: 'quantity', header: 'Quantity', align: 'right' },
  ]);

  readonly emptyText = computed(
    () =>
      this.loadError() ||
      (this.tab() === 'low' ? 'No product is at or below its minimum stock.' : 'Every product has stock.'),
  );

  constructor() {
    this.dashboard
      .stockAlerts()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: alerts => {
          this.alerts.set(alerts);
          this.loaded.set(true);
        },
        error: (error: unknown) => {
          this.loaded.set(true);
          this.loadError.set(apiErrorMessage(error, 'Could not load stock.'));
        },
      });
  }
}
