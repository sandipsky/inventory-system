import { IconName } from '@lumen-ui/angular';

/** The four simple masters. Their endpoints work the same way; only the path and permissions differ. */
export type MasterKind = 'category' | 'unit' | 'packing' | 'taxType';

export interface MasterConfig {
  /** Segment under `/master`. */
  path: string;
  singular: string;
  plural: string;
  /** Backend operations are `View<operation>`, `Create<operation>`, `Edit<operation>` and `Delete<operation>`. */
  operation: string;
  icon: IconName;
  /** Tax types also carry a `tax_rate`. */
  hasRate?: boolean;
}

export const MASTERS: Record<MasterKind, MasterConfig> = {
  // The API spells it `categorys`.
  category: { path: 'categorys', singular: 'Category', plural: 'Categories', operation: 'Category', icon: 'category' },
  unit: { path: 'units', singular: 'Unit', plural: 'Units', operation: 'Unit', icon: 'hash' },
  packing: { path: 'packings', singular: 'Packing', plural: 'Packings', operation: 'Packing', icon: 'content_copy' },
  taxType: {
    path: 'taxtypes',
    singular: 'Tax Type',
    plural: 'Tax Types',
    operation: 'TaxType',
    icon: 'money',
    hasRate: true,
  },
};

/** `GET /master/<path>/{id}` and the rows of `GET /master/<path>`. */
export interface MasterRecord {
  id: number;
  name: string;
  is_active: boolean;
  /** Tax types only: a percent, e.g. `13`. */
  tax_rate?: number;
}

/** Body of `POST /master/<path>` and `PUT /master/<path>/{id}`. */
export type MasterPayload = Omit<MasterRecord, 'id'>;

/** Data handed to the master form through DRAWER_DATA. Without a `record` the form adds one. */
export interface MasterFormData {
  kind: MasterKind;
  record?: MasterRecord;
}
