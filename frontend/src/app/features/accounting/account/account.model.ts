/** `GET /accountMaster/{id}` and the rows of `GET /accountMaster`. */
export interface Account {
  id: number;
  account_code: string | null;
  account_name: string;
  /** A type name from `GET /accountMaster/getAccountTypes`, e.g. `Cash & Cash Equivalents`. */
  account_type: string;
  /** `0` when the account has no parent. */
  parent_id: number;
  parent_account_name: string | null;
  is_active: boolean;
  /** Seeded accounts. Purchases, sales and new vendors/customers find several of them by name. */
  is_system_generated: boolean;
  /** `false` for system accounts; deleting one fails. */
  deletable: boolean;
  remarks: string | null;
}

/**
 * Body of `POST /accountMaster` and `PUT /accountMaster/{id}`. The API stores
 * `parent_account_name` and `deletable` as sent, so every save carries both.
 */
export type AccountPayload = Omit<Account, 'id' | 'is_system_generated'>;

/** `GET /accountMaster/getAccountTypes`: the type names under each heading (Assets, Liability, …). */
export interface AccountTypeGroup {
  heading: string;
  types: string[];
}

/**
 * Accounts the user didn't create. Vendor and customer accounts are created with their party
 * and renamed whenever it is saved.
 */
export type AccountOwner = 'system' | 'vendor' | 'customer';

/** Data handed to the account form through DRAWER_DATA. Without a `record` the form adds one. */
export interface AccountFormData {
  record?: Account;
  /** Locks the name, type and parent of a system, vendor or customer account. */
  owner?: AccountOwner;
}
