import { DropdownItem } from '../models/api.model';
import { DocNoPipe } from '../pipes/doc-no.pipe';

/**
 * `items` plus any of `extra` it doesn't already contain. Merges a saved record's own
 * choices into active-only dropdown options, so an inactive one still shows its label.
 */
export function withMissing(items: DropdownItem[], extra: DropdownItem[]): DropdownItem[] {
  const ids = new Set(items.map(item => item.id));
  return [...items, ...extra.filter(item => !ids.has(item.id))];
}

/** Document dropdown rows (`name` is a raw `system_entry_no`) labelled the way the `docNo` pipe shows them. */
export function docNoOptions(items: DropdownItem[]): DropdownItem[] {
  const docNo = new DocNoPipe();
  return items.map(item => ({ id: item.id, name: docNo.transform(item.name) }));
}
