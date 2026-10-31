import { IconName } from '@lumen-ui/angular';

export interface SidebarLink {
  label: string;
  route: string;
  /** Backend `operation.name` that grants access to this page (e.g. `ViewProduct`). */
  operation?: string;
  icon?: IconName;
}

export interface SidebarItem extends SidebarLink {
  icon: IconName;
  /** Backend `operation.master_module` this item belongs to. */
  masterModule?: string;
  children?: SidebarLink[];
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}
