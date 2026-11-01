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
