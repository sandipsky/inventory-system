/** Vendors and customers. Their endpoints and fields are the same; only the path and permissions differ. */
export type PartyKind = 'vendor' | 'customer';

export interface PartyConfig {
  /** `/vendor` or `/customer`. */
  path: string;
  singular: string;
  plural: string;
  /** Backend operations are `View<operation>`, `Create<operation>`, `Edit<operation>` and `Delete<operation>`. */
  operation: string;
}

export const PARTIES: Record<PartyKind, PartyConfig> = {
  vendor: { path: 'vendor', singular: 'Vendor', plural: 'Vendors', operation: 'Vendor' },
  customer: { path: 'customer', singular: 'Customer', plural: 'Customers', operation: 'Customer' },
};

/** `GET /vendor/{id}` (or `/customer/{id}`) and the rows of their lists. */
export interface Party {
  id: number;
  name: string;
  registration_number: string | null;
  contact: string | null;
  address: string | null;
  email: string | null;
  remarks: string | null;
  is_active: boolean;
}

/**
 * Body of `POST` and `PUT`. The API trims every text field and fails with a 500 on `null`,
 * so blank fields go as `''`.
 */
export interface PartyPayload {
  name: string;
  registration_number: string;
  contact: string;
  address: string;
  email: string;
  remarks: string;
  is_active: boolean;
}

/** Data handed to the party form through DRAWER_DATA. Without a `record` the form adds one. */
export interface PartyFormData {
  kind: PartyKind;
  record?: Party;
}
