/** An operation a role grants, as listed on `GET /roles` rows and `GET /roles/{id}`. */
export interface RoleOperation {
  id: number;
  /** e.g. `CreateCategory`. */
  name: string;
  /** e.g. `Category`. */
  module: string;
  /** e.g. `Masters`. */
  master_module: string;
}

/** `GET /roles/{id}` and the rows of `GET /roles`. */
export interface Role {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  operation_ids: number[];
  operations: RoleOperation[];
}

/** Body of `POST /roles` and `PUT /roles/{id}`. `operation_ids` replaces the role's operations. */
export interface RolePayload {
  name: string;
  description: string | null;
  is_active: boolean;
  operation_ids: number[];
}

/** `GET /roles/operations/{id}`: every operation, grouped by master module, then module. */
export interface OperationGroup {
  master_module: string;
  modules: {
    module_name: string;
    /** `selected` marks the operations the requested role has. */
    operations: { id: number; name: string; selected: boolean }[];
  }[];
}

/** How the role form was opened. `view` can switch to `edit` from inside the drawer. */
export type RoleFormMode = 'add' | 'edit' | 'view';

/** Data handed to the role form through DRAWER_DATA. */
export interface RoleFormData {
  mode: RoleFormMode;
  /** Role id; required for `edit` and `view`. */
  id?: number;
}
