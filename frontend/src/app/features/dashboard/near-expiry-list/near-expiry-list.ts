import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button, DRAWER_DATA, DrawerRef, Icon, Table, TableCellDirective, TableColumn } from '@lumen-ui/angular';
import { DateText } from '../../../shared/components/date-text/date-text';
import { batchName, isExpired } from '../../../shared/utils/batch';
import { NearExpiryBatch } from '../dashboard.model';

/** Data handed to NearExpiryList through DRAWER_DATA: the card's batches, so nothing loads. */
export interface NearExpiryListData {
  batches: NearExpiryBatch[];
  months: number;
}

/** Every near-expiry batch of the dashboard card, soonest first, in a right drawer. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DateText, DecimalPipe, Icon, Table, TableCellDirective],
  selector: 'app-near-expiry-list',
  styleUrl: './near-expiry-list.scss',
  template: `
    <div class="drawer">
      <header class="head">
        <div class="heading">
          <span class="badge" aria-hidden="true"><l-icon name="clock" [size]="18" color="inherit" /></span>
          <div>
            <h2 class="title">Near Expiry Products</h2>
            <p class="subtitle">Batches in stock that expire within {{ months }} {{ months === 1 ? 'month' : 'months' }}</p>
          </div>
        </div>
        <l-button variant="ghost" size="md" [rounded]="true" aria-label="Close" (click)="close()">
          <l-icon name="cross" [size]="20" color="inherit" />
        </l-button>
      </header>

      <div class="body">
        <l-table class="table" [rowKey]="rowKey" [columns]="columns" [data]="batches" emptyText="No batches expire in this period.">
          <ng-template lTableCell="sn" let-index="index">{{ index + 1 }}</ng-template>
          <ng-template lTableCell="batch_no" let-row>{{ batchName(row.batch_no) }}</ng-template>
          <ng-template lTableCell="expiry_date" let-row>
            <app-date-text [class.expired]="isExpired(row.expiry_date)" [date]="row.expiry_date" />
          </ng-template>
          <ng-template lTableCell="quantity" let-row>{{ row.quantity | number: '1.0-2' }}</ng-template>
        </l-table>
      </div>
    </div>
  `,
})
export class NearExpiryList {
  private readonly drawerRef = inject<DrawerRef<NearExpiryList>>(DrawerRef, { optional: true });
  private readonly data = inject<NearExpiryListData | null>(DRAWER_DATA, { optional: true });

  readonly batches = this.data?.batches ?? [];
  readonly months = this.data?.months ?? 0;

  readonly columns: TableColumn[] = [
    { key: 'sn', header: 'S.N', width: '56px' },
    { key: 'product_name', header: 'Product' },
    { key: 'batch_no', header: 'Batch' },
    { key: 'expiry_date', header: 'Expiry Date' },
    { key: 'quantity', header: 'In Stock', align: 'right' },
  ];

  // A batch id is unique within its product only.
  readonly rowKey = (batch: NearExpiryBatch) => `${batch.product_id}-${batch.batch_id}`;
  readonly batchName = batchName;
  readonly isExpired = isExpired;

  close() {
    this.drawerRef?.close();
  }
}
