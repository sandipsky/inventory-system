import { DropdownItem } from '../models/api.model';
import { BatchStock } from '../models/product.model';

/** A batch's number, or `Default batch` for the product's default one (`batch_id` 0, no number). */
export function batchName(batchNo: string | null | undefined): string {
  return batchNo || 'Default batch';
}

/** Batch picker options: `B1 · 15 in stock`. */
export function batchOptions(batches: readonly BatchStock[]): DropdownItem[] {
  return batches.map(batch => ({
    id: batch.batch_id,
    name: `${batchName(batch.batch_no)} · ${batch.available_quantity} in stock`,
  }));
}

/** The batch to take goods from first: the earliest expiry among those in stock, else the first one. */
export function firstBatch(batches: readonly BatchStock[]): BatchStock | undefined {
  const inStock = batches.filter(batch => batch.available_quantity > 0);
  const expiry = (batch: BatchStock) => batch.expiry_date ?? '9999-12-31';
  return [...inStock].sort((a, b) => expiry(a).localeCompare(expiry(b)))[0] ?? batches[0];
}
