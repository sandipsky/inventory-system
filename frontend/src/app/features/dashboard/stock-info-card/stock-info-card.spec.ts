import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { StockInfoCard } from './stock-info-card';

describe('StockInfoCard', () => {
  it('lists low stock, then empty stock on the other tab', async () => {
    await TestBed.configureTestingModule({
      imports: [StockInfoCard],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StockInfoCard);
    const card = fixture.componentInstance;

    http.expectOne(`${environment.apiUrl}/dashboard/stock-alerts`).flush({
      minimum_stock: [{ product_id: 1, product_name: 'Pencil', product_code: 'P1', quantity: 3, min_stock: 5 }],
      zero_quantity: [{ product_id: 2, product_name: 'Chair', product_code: null, quantity: 0, min_stock: 2 }],
    });
    await fixture.whenStable();

    expect(card.rows().map(row => row.product_name)).toEqual(['Pencil']);
    expect(card.columns().map(column => column.key)).toContain('min_stock');

    card.tab.set('zero');
    await fixture.whenStable();

    expect(card.rows().map(row => row.product_name)).toEqual(['Chair']);
    expect(card.columns().map(column => column.key)).toEqual(['product_name', 'quantity']);
  });
});
