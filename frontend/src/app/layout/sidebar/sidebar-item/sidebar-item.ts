import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, TooltipDirective } from '@lumen-ui/angular';
import { filter, map, startWith } from 'rxjs';
import { SidebarItem as SidebarItemModel } from '../sidebar.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon, TooltipDirective],
  selector: 'app-sidebar-item',
  styleUrl: './sidebar-item.scss',
  templateUrl: './sidebar-item.html',
})
export class SidebarItem {
  readonly item = input.required<SidebarItemModel>();
  readonly collapsed = input(false);
  /** Keep the group open regardless of the user's toggle (used while searching). */
  readonly forceOpen = input(false);

  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly hasChildren = computed(() => !!this.item().children?.length);

  /** A group is active when the current URL sits under its base route. */
  readonly groupActive = computed(() => {
    const base = this.item().route;
    const url = this.url();
    return this.hasChildren() && (url === base || url.startsWith(`${base}/`));
  });

  private readonly manuallyExpanded = signal<boolean | null>(null);

  readonly expanded = computed(() => {
    if (this.forceOpen()) return true;
    return this.manuallyExpanded() ?? this.groupActive();
  });

  toggle() {
    this.manuallyExpanded.set(!this.expanded());
  }
}
