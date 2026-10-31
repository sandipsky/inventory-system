/** How the purchase entry form was opened. `view` can switch to `edit` from inside the drawer. */
export type PurchaseFormMode = 'add' | 'edit' | 'view';

/** Data handed to the purchase entry form through DRAWER_DATA. */
export interface PurchaseFormData {
  mode: PurchaseFormMode;
  /** Purchase entry id; required for `edit` and `view`. */
  id?: number;
}
