import { CalendarSystem } from '@lumen-ui/angular';

/**
 * A row of `GET /opening-stock` and `GET /stock-edit`: one batch of a product with the stock it
 * holds now. Both lists page over every product batch.
 */
export interface StockBatch {
  /** The stock row's own id; address a batch by `product_id` and `batch_id` instead. */
  id: number;
  product_id: number;
  product_name: string | null;
  /** `0` is the product's default batch, which has no `batch_no`. */
  batch_id: number;
  batch_no: string | null;
  /** `YYYY-MM-DD`. */
  expiry_date: string | null;
  quantity: number;
  cost_price: number | null;
  selling_price: number | null;
  mrp: number | null;
}

/**
 * Body of `POST /opening-stock`. A blank `batch_no` sets the product's default batch. Each batch
 * gets opening stock once; the API answers 409 for a batch that already exists.
 */
export interface OpeningStockPayload {
  product_id: number;
  batch_no: string | null;
  expiry_date: string | null;
  quantity: number;
  cost_price: number;
  selling_price: number;
  mrp: number;
}

/** Body of `PUT /stock-edit/{productId}/{batchId}`: overwrites the batch's figures, leaving no history. */
export interface StockEditPayload {
  quantity: number;
  cost_price: number;
  selling_price: number;
  mrp: number;
  /** `null` clears the batch's expiry date. */
  expiry_date: string | null;
}

/** Data handed to StockEditForm through DRAWER_DATA: the list row, so nothing loads. */
export interface StockEditFormData {
  batch: StockBatch;
  /** Calendar the expiry date field starts in; the list's AD/BS switch. Defaults to `bs`. */
  calendar?: CalendarSystem;
}

/** Data handed to OpeningStockForm through DRAWER_DATA. */
export interface OpeningStockFormData {
  calendar?: CalendarSystem;
}

/** `In` adds stock to the batch, `Out` takes it away. */
export type AdjustmentType = 'In' | 'Out';

export const ADJUSTMENT_TYPES: { value: AdjustmentType; label: string }[] = [
  { value: 'In', label: 'Stock In' },
  { value: 'Out', label: 'Stock Out' },
];

/** How the stock adjustment form was opened. `view` can switch to `edit` from inside the drawer. */
export type StockAdjustmentFormMode = 'add' | 'edit' | 'view';

/** Data handed to the stock adjustment form through DRAWER_DATA. */
export interface StockAdjustmentFormData {
  mode: StockAdjustmentFormMode;
  /** Adjustment id; required for `edit` and `view`. */
  id?: number;
  /** Calendar the date field starts in; the list's AD/BS switch. Defaults to `bs`. */
  calendar?: CalendarSystem;
}

/** One line (`stockAdjustmentEntries[]`): moves `quantity` of one product batch in or out. */
export interface StockAdjustmentLine {
  id: number;
  product_id: number;
  /** Read only. */
  product_name?: string | null;
  /** Picked from `GET /products/stockInfo/{id}`; `0` is the default batch. */
  batch_id: number;
  /** Read only; `null` for the default batch. */
  batch_no?: string | null;
  adjustment_type: AdjustmentType;
  quantity: number;
  reason: string | null;
}

/** `GET /stock-adjustment/{id}`. The rows of `GET /stock-adjustment` have no lines (`null`). */
export interface StockAdjustment {
  id: number;
  /** `YYYY-MM-DD`. */
  date: string;
  /** e.g. `|SA-000001`; display it through the `docNo` pipe. */
  system_entry_no: string;
  remarks: string | null;
  stockAdjustmentEntries: StockAdjustmentLine[] | null;
}

/** Body of `POST /stock-adjustment` and `PUT /stock-adjustment/{id}`. */
export interface StockAdjustmentPayload {
  date: string;
  remarks: string | null;
  /** Saved lines keep their `id`, so an update edits them instead of replacing them. */
  stockAdjustmentEntries: (Omit<StockAdjustmentLine, 'id' | 'product_name' | 'batch_no'> & { id?: number })[];
}
