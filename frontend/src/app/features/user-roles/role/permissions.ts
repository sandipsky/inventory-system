import { OperationGroup } from './role.model';

/** Columns of the permission matrix. An operation named `<Action><Module>` goes in its column. */
export const PERMISSION_ACTIONS = ['View', 'Create', 'Edit', 'Delete'] as const;

/** One module's operations, laid out as a matrix row. */
export interface PermissionRow {
  module: string;
  /** `TaxType` → `Tax Type`. */
  label: string;
  /** The operation id in each PERMISSION_ACTIONS column, or `null` when the module has none. */
  actions: (number | null)[];
  /** Operations that fit no column, e.g. `CancelSalesEntry` or `ViewVendorPayment`. */
  extras: { id: number; label: string }[];
  /** Every operation of the module. */
  ids: number[];
}

/** A master module (Masters, Purchase, …) and its modules. */
export interface PermissionGroup {
  title: string;
  rows: PermissionRow[];
  ids: number[];
}

export function toPermissionGroups(groups: OperationGroup[]): PermissionGroup[] {
  return groups.map(group => {
    const rows = group.modules.map(module => toRow(module.module_name, module.operations));
    return { title: group.master_module, rows, ids: rows.flatMap(row => row.ids) };
  });
}

function toRow(module: string, operations: { id: number; name: string }[]): PermissionRow {
  const actions: (number | null)[] = PERMISSION_ACTIONS.map(() => null);
  const extras: PermissionRow['extras'] = [];

  for (const operation of operations) {
    // `ViewSalesEntries` → `View` + `SalesEntries`.
    const [, verb = '', subject = ''] = /^([A-Z][a-z]+)(.*)$/.exec(operation.name) ?? [];
    const onModule = subject === module || subject === plural(module);
    const column = (PERMISSION_ACTIONS as readonly string[]).indexOf(verb);

    if (onModule && column >= 0 && actions[column] === null) actions[column] = operation.id;
    else extras.push({ id: operation.id, label: onModule ? verb : words(operation.name) });
  }

  return { module, label: words(module), actions, extras, ids: operations.map(operation => operation.id) };
}

/** `SalesEntry` → `SalesEntries`, as in `ViewSalesEntries`. */
function plural(word: string): string {
  return word.endsWith('y') ? `${word.slice(0, -1)}ies` : `${word}s`;
}

/** `ViewVendorPayment` → `View Vendor Payment`. */
function words(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2');
}
