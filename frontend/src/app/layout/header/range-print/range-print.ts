import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button, CalendarSystem, DateInput, DrawerRef, Icon, Select } from '@lumen-ui/angular';
import { Observable, tap } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { PARTY_TYPES, VIEW_PAYMENT_OPERATIONS } from '../../../features/accounting/payment/payment.model';
import { PaymentService } from '../../../features/accounting/payment/payment.service';
import { PurchaseReturnService } from '../../../features/purchase/purchase-return.service';
import { PurchaseService } from '../../../features/purchase/purchase.service';
import { SalesReturnService } from '../../../features/sales/sales-return.service';
import { SalesService } from '../../../features/sales/sales.service';
import { ListParams } from '../../../shared/models/api.model';
import { FileDownloads } from '../../../shared/services/file-downloads';
import { startOfToday, toIsoDate } from '../../../shared/utils/date';
import { RANGE_PRINT_OPTIONS, RangePrintDocument } from './range-print.model';

/**
 * Range Print, opened from the header's printer button in a 350px right drawer: every document
 * of one kind dated between two days, printed by the API as one PDF with a page per document.
 * Only the kinds the role may view are offered.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DateInput, FormsModule, Icon, Select],
  providers: [FileDownloads],
  selector: 'app-range-print',
  styleUrl: './range-print.scss',
  templateUrl: './range-print.html',
})
export class RangePrint {
  private readonly auth = inject(AuthService);
  private readonly drawerRef = inject<DrawerRef<RangePrint, void>>(DrawerRef, { optional: true });
  private readonly payments = inject(PaymentService);
  private readonly purchases = inject(PurchaseService);
  private readonly purchaseReturns = inject(PurchaseReturnService);
  private readonly sales = inject(SalesService);
  private readonly salesReturns = inject(SalesReturnService);
  readonly downloads = inject(FileDownloads);

  readonly options = RANGE_PRINT_OPTIONS.filter(option => this.auth.hasOperation(option.operation));

  readonly calendar = signal<CalendarSystem>('bs');
  readonly fromDate = signal<Date | null>(startOfToday());
  readonly toDate = signal<Date | null>(startOfToday());
  readonly document = signal<RangePrintDocument | null>(this.options[0]?.value ?? null);

  readonly ready = computed(() => !!this.document() && !!this.fromDate() && !!this.toDate());

  /** Downloads the PDF and closes; a period with nothing in it is reported by the API. */
  print() {
    const document = this.document();
    const from = this.fromDate();
    const to = this.toDate();
    if (!document || !from || !to) return;
    const params: ListParams = { fromDate: toIsoDate(from), toDate: toIsoDate(to), calendar: this.calendar() };
    this.downloads.run('pdf', this.file(document, params).pipe(tap(() => this.close())));
  }

  close() {
    this.drawerRef?.close();
  }

  private file(document: RangePrintDocument, params: ListParams): Observable<void> {
    switch (document) {
      case 'purchase':
        return this.purchases.printRange(params);
      case 'sales':
        return this.sales.printRange(params);
      case 'purchase-return':
        return this.purchaseReturns.printRange(params);
      case 'sales-return':
        return this.salesReturns.printRange(params);
      case 'payment': {
        // A role that views one party type prints only that one, as on the payments page
        const types = PARTY_TYPES.filter(type => this.auth.hasOperation(VIEW_PAYMENT_OPERATIONS[type.value]));
        return this.payments.printRange(types.length === 1 ? { ...params, type: types[0].value } : params);
      }
    }
  }
}
