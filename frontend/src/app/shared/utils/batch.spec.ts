import { BatchStock } from '../models/product.model';
import { batchName, batchOptions, firstBatch } from './batch';

function batch(batch_id: number, batch_no: string | null, available_quantity: number, expiry_date: string | null): BatchStock {
  return { batch_id, batch_no, expiry_date, available_quantity, cost_price: 40, selling_price: 50, mrp: 55 };
}

describe('batch helpers', () => {
  it('names the default batch', () => {
    expect(batchName(null)).toBe('Default batch');
    expect(batchName('B1')).toBe('B1');
  });

  it('labels options with their stock', () => {
    expect(batchOptions([batch(0, null, 7, null), batch(1, 'B1', 15, '2027-01-31')])).toEqual([
      { id: 0, name: 'Default batch · 7 in stock' },
      { id: 1, name: 'B1 · 15 in stock' },
    ]);
  });

  it('takes the earliest expiry in stock first, undated batches last', () => {
    const batches = [
      batch(0, null, 7, null),
      batch(1, 'B1', 0, '2026-12-31'),
      batch(2, 'B2', 3, '2027-06-30'),
      batch(3, 'B3', 5, '2027-01-31'),
    ];
    expect(firstBatch(batches)?.batch_id).toBe(3);
    expect(firstBatch([batches[0], batches[1]])?.batch_id).toBe(0);
  });

  it('falls back to the first batch when nothing is in stock', () => {
    expect(firstBatch([batch(0, null, 0, null), batch(1, 'B1', 0, null)])?.batch_id).toBe(0);
    expect(firstBatch([])).toBeUndefined();
  });
});
