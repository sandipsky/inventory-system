import { DropdownItem } from '../models/api.model';

/**
 * `items` plus any of `extra` it doesn't already contain. Merges a saved record's own
 * choices into active-only dropdown options, so an inactive one still shows its label.
 */
export function withMissing(items: DropdownItem[], extra: DropdownItem[]): DropdownItem[] {
  const ids = new Set(items.map(item => item.id));
  return [...items, ...extra.filter(item => !ids.has(item.id))];
}
