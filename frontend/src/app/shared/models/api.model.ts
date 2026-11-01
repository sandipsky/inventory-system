/** Spring `Page<T>` as returned by every paged list endpoint (only the fields the UI reads). */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  /** Zero-based page index. */
  number: number;
  size: number;
}

/** Body of every create / update / delete response, and of every error response. */
export interface ApiResponse {
  success: boolean;
  message: string;
  errorCode: number;
  timestamp: number;
  /** Id of the record that was created, updated or deleted. */
  post_data_id: number;
}

/** `{ id, name }` row from the `/dropdown/...` endpoints. */
export interface DropdownItem {
  id: number;
  name: string;
}

/**
 * Query params for a paged list: `pageIndex`, `pageSize`, `sort` (`field:asc`) plus
 * any "contains" filter keyed by the entity's camelCase field name.
 */
export type ListParams = Record<string, string | number>;
