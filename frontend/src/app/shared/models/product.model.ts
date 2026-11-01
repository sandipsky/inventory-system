/** `GET /products/{id}`: only the fields document line items read. */
export interface Product {
  id: number;
  name: string;
  code: string | null;
  cost_price: number | null;
  selling_price: number | null;
  mrp: number | null;
  unit_id: number;
  unit_name: string | null;
  tax_type_id: number | null;
  tax_type_name: string | null;
  /** Percent, e.g. `13`; `0` when the product has no tax type. */
  tax_rate: number;
  has_expiry_date: boolean;
}

/** "Buy at least `min_quantity`, get `bonus_quantity` free." */
export interface BonusInfo {
  /** Present on saved rules; the server replaces the whole list on every save. */
  id?: number;
  min_quantity: number;
  bonus_quantity: number;
}

/** Every field of `GET /products/{id}` and of the rows of `GET /products`. */
export interface ProductDetail extends Product {
  barcode: string | null;
  remarks: string | null;
  max_stock: number | null;
  min_stock: number | null;
  /** Stored as a label only, e.g. `FIFO`; required. */
  valuation_method: string;
  category_id: number | null;
  category_name: string | null;
  packing_id: number | null;
  packing_name: string | null;
  is_active: boolean;
  /** Product flags have no `is_` prefix. */
  purchasable: boolean;
  sellable: boolean;
  service_item: boolean;
  is_batch_available: boolean;
  has_manufacturing_date: boolean;
  /** Read only: `Purchasable` and/or `Sellable`. */
  product_types: string[];
  bonus_infos: BonusInfo[];
}

/** Body of `POST /products` and `PUT /products/{id}`. */
export type ProductPayload = Omit<
  ProductDetail,
  'id' | 'unit_name' | 'category_name' | 'packing_name' | 'tax_type_name' | 'tax_rate' | 'product_types'
>;
