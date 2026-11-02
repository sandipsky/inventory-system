import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Button, Card, DrawerService, Icon, Select, Skeleton } from '@lumen-ui/angular';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { DateText } from '../../../shared/components/date-text/date-text';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { batchName, isExpired } from '../../../shared/utils/batch';
import { MONTH_OPTIONS, NearExpiryBatch } from '../dashboard.model';
import { DashboardService } from '../dashboard.service';
import { NearExpiryList, NearExpiryListData } from '../near-expiry-list/near-expiry-list';

/** Batches drawn in their own color; the rest share one gray slice. */
const SLOTS = 5;
const RADIUS = 70;
const STROKE = 14;
/** Surface showing between two slices' round caps. */
const GAP = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface DonutSlice {
  /** Dash length and where it starts along the ring, clockwise from the top. */
  length: number;
  start: number;
}

/**
 * Ring slices sized by value, each with a gap after it. Round caps reach `STROKE / 2` past a
 * dash's ends, so the gaps make room for both caps plus `GAP` of surface; a tiny value still
 * draws as a dot.
 */
export function donutSlices(values: readonly number[]): DonutSlice[] {
  if (values.length === 1) return [{ length: CIRCUMFERENCE, start: 0 }];
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const space = STROKE + GAP;
  const available = CIRCUMFERENCE - values.length * space;
  let start = space / 2;
  return values.map(value => {
    const slice = { length: Math.max((available * value) / total, 0.01), start };
    start += slice.length + space;
    return slice;
  });
}

/**
 * Batches in stock that expire within the chosen months (expired ones included), soonest first,
 * as a ring of their quantities with the first five named beside it (`GET /dashboard/near-expiry`,
 * which needs `ViewStockEdit`).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Card, DateText, DecimalPipe, FormsModule, Icon, Select, Skeleton],
  selector: 'app-near-expiry-card',
  styleUrls: ['../dashboard-card.scss', './near-expiry-card.scss'],
  templateUrl: './near-expiry-card.html',
})
export class NearExpiryCard {
  private readonly dashboard = inject(DashboardService);
  private readonly drawer = inject(DrawerService);

  readonly monthOptions = MONTH_OPTIONS;
  readonly months = signal(6);

  /** `null` until first loaded. */
  readonly batches = signal<NearExpiryBatch[] | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  /** Index of the slice under the pointer, shown in the ring's middle. */
  readonly active = signal<number | null>(null);

  readonly slices = computed(() => {
    const batches = this.batches() ?? [];
    const named = batches.slice(0, SLOTS).map((batch, i) => ({
      name: batch.product_name,
      batch: batchName(batch.batch_no),
      quantity: batch.quantity,
      expiry: batch.expiry_date as string | null,
      color: `var(--chart-${i + 1})`,
    }));
    const rest = batches.slice(SLOTS);
    const slices = rest.length
      ? [
          ...named,
          {
            name: `${rest.length} more ${rest.length === 1 ? 'batch' : 'batches'}`,
            batch: '',
            quantity: rest.reduce((sum, batch) => sum + batch.quantity, 0),
            expiry: null,
            color: 'var(--text-quaternary)',
          },
        ]
      : named;
    const geometry = donutSlices(slices.map(slice => slice.quantity));
    return slices.map((slice, i) => ({
      ...slice,
      dash: `${geometry[i].length} ${CIRCUMFERENCE}`,
      offset: -geometry[i].start,
    }));
  });

  readonly center = computed(() => {
    const slice = this.slices()[this.active() ?? -1];
    return slice ? { value: slice.quantity, label: slice.name } : { value: this.batches()?.length ?? 0, label: 'Batches' };
  });

  readonly ring = { radius: RADIUS, stroke: STROKE, size: 2 * RADIUS + STROKE };
  readonly isExpired = isExpired;

  constructor() {
    toObservable(this.months)
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(months =>
          this.dashboard.nearExpiry(months).pipe(
            map(batches => ({ batches, error: '' })),
            catchError((error: unknown) => of({ batches: null, error: apiErrorMessage(error, 'Could not load stock.') })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ batches, error }) => {
        this.loading.set(false);
        this.loadError.set(error);
        if (batches) this.batches.set(batches);
      });
  }

  /** Every batch in the period, in a right drawer. */
  viewAll() {
    this.drawer.open<NearExpiryList, NearExpiryListData>(NearExpiryList, {
      data: { batches: this.batches() ?? [], months: this.months() },
      position: 'right',
      size: '560px',
    });
  }
}
