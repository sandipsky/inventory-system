import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Icon } from '@lumen-ui/angular';
import { SIDEBAR_FOOTER_ITEMS, SIDEBAR_SECTIONS } from './sidebar.data';
import { SidebarItem as SidebarItemModel, SidebarSection } from './sidebar.model';
import { SidebarItem } from './sidebar-item/sidebar-item';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, SidebarItem],
  selector: 'app-sidebar',
  styleUrl: './sidebar.scss',
  templateUrl: './sidebar.html',
})
export class Sidebar {
  readonly sections = SIDEBAR_SECTIONS;
  readonly footerItems = SIDEBAR_FOOTER_ITEMS;

  readonly collapsed = signal(false);
  readonly search = signal('');

  readonly searching = computed(() => this.search().trim().length > 0);

  /** Sections narrowed to the items (or children) whose label contains the query. */
  readonly filteredSections = computed<SidebarSection[]>(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.sections;

    const matches = (label: string) => label.toLowerCase().includes(query);

    return this.sections
      .map(section => ({
        ...section,
        items: section.items
          .map((item): SidebarItemModel | null => {
            if (matches(item.label)) return item;
            const children = item.children?.filter(child => matches(child.label)) ?? [];
            return children.length ? { ...item, children } : null;
          })
          .filter((item): item is SidebarItemModel => item !== null),
      }))
      .filter(section => section.items.length > 0);
  });

  toggleCollapsed() {
    this.collapsed.update(v => !v);
  }

  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  clearSearch() {
    this.search.set('');
  }
}
