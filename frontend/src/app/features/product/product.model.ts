/** How the product form was opened. `view` can switch to `edit` from inside the drawer. */
export type ProductFormMode = 'add' | 'edit' | 'view';

/** Data handed to the product form through DRAWER_DATA. */
export interface ProductFormData {
  mode: ProductFormMode;
  /** Product id; required for `edit` and `view`. */
  id?: number;
}

/** Choices for `valuation_method`. The API requires one but only stores the label. */
export const VALUATION_METHODS: readonly string[] = ['FIFO', 'LIFO', 'Weighted Average'];
