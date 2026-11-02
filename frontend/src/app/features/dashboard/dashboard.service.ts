import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BalanceSummary,
  DateRange,
  NearExpiryBatch,
  PurchaseSummary,
  PurchaseVsSales,
  SalesSummary,
  StockAlerts,
  TrendInterval,
} from './dashboard.model';

/**
 * The dashboard cards' figures (`/dashboard`). Each endpoint needs the View permission of what
 * it sums; within one, a figure the role may not view comes back `null`.
 */
@Service()
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  /** `ViewAccount`. */
  balances(): Observable<BalanceSummary> {
    return this.http.get<BalanceSummary>(`${this.baseUrl}/balances`);
  }

  /** `ViewPurchaseEntry` or `ViewSalesEntries`. */
  purchaseVsSales(interval: TrendInterval): Observable<PurchaseVsSales> {
    return this.http.get<PurchaseVsSales>(`${this.baseUrl}/purchase-vs-sales`, { params: { interval } });
  }

  /** `ViewSalesEntries` or `ViewSalesReturns`. */
  salesSummary(range: DateRange): Observable<SalesSummary> {
    return this.http.get<SalesSummary>(`${this.baseUrl}/sales-summary`, { params: { ...range } });
  }

  /** `ViewPurchaseEntry` or `ViewPurchaseReturn`. */
  purchaseSummary(range: DateRange): Observable<PurchaseSummary> {
    return this.http.get<PurchaseSummary>(`${this.baseUrl}/purchase-summary`, { params: { ...range } });
  }

  /** Batches with stock expiring within `months` from today, expired ones included (`ViewStockEdit`). */
  nearExpiry(months: number): Observable<NearExpiryBatch[]> {
    return this.http.get<NearExpiryBatch[]>(`${this.baseUrl}/near-expiry`, { params: { months } });
  }

  /** `ViewStockEdit`. */
  stockAlerts(): Observable<StockAlerts> {
    return this.http.get<StockAlerts>(`${this.baseUrl}/stock-alerts`);
  }
}
