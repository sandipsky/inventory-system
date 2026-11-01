import { Service, WritableSignal, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { BatchStock, Product } from '../models/product.model';
import { ProductService } from './product.service';

/**
 * Details (code, unit, tax rate) and batches of the products on a document's lines, each
 * fetched once. Not a singleton: every document form lists it in its own `providers`.
 */
@Service({ autoProvided: false })
export class ProductLookup {
  private readonly productService = inject(ProductService);

  /** `GET /products/{id}` by product id. */
  readonly products = signal<ReadonlyMap<number, Product>>(new Map());
  /** `GET /products/stockInfo/{id}` by product id. */
  readonly batches = signal<ReadonlyMap<number, BatchStock[]>>(new Map());

  /** Fetches the details of products not loaded yet. A product the user may not view is skipped. */
  loadProducts(ids: readonly number[]): Observable<void> {
    return this.load(ids, this.products, id => this.productService.get(id));
  }

  /** Fetches the batches of products not loaded yet. */
  loadBatches(ids: readonly number[]): Observable<void> {
    return this.load(ids, this.batches, id => this.productService.stockInfo(id));
  }

  private load<T>(
    ids: readonly number[],
    store: WritableSignal<ReadonlyMap<number, T>>,
    fetch: (id: number) => Observable<T>,
  ): Observable<void> {
    const known = store();
    const missing = [...new Set(ids)].filter(id => !known.has(id));
    if (!missing.length) return of(undefined);

    return forkJoin(
      missing.map(id =>
        fetch(id).pipe(
          map(value => ({ id, value })),
          catchError(() => of(null)),
        ),
      ),
    ).pipe(
      map(results => {
        const next = new Map(store());
        for (const result of results) {
          if (result) next.set(result.id, result.value);
        }
        store.set(next);
      }),
    );
  }
}
