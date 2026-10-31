import { Service, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { BreadcrumbItem } from '@lumen-ui/angular';
import { filter, map, startWith } from 'rxjs';

export const HOME_CRUMB: BreadcrumbItem = { label: 'Home', link: '/dashboard' };

/**
 * Builds the breadcrumb trail for `<l-breadcrumb>` from the active route.
 *
 * Each route segment that declares `data.breadcrumb` (or `title`) contributes a
 * crumb; the last crumb doubles as the page title. A page can override the
 * route-derived trail (for example to show the record name on an edit form)
 * with `set()`; the override is dropped on the next navigation.
 */
@Service()
export class BreadcrumbService {
  private readonly router = inject(Router);

  private readonly override = signal<BreadcrumbItem[] | null>(null);

  private readonly fromRoute = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => {
        this.override.set(null);
        return this.build(this.router.routerState.snapshot.root);
      }),
      startWith(this.build(this.router.routerState.snapshot.root)),
    ),
    { initialValue: [] as BreadcrumbItem[] },
  );

  /** Full trail, starting with Home. */
  readonly items = computed<BreadcrumbItem[]>(() => {
    const trail = this.override() ?? this.fromRoute();
    return [HOME_CRUMB, ...trail];
  });

  /** Page title shown above the trail (label of the last crumb). */
  readonly title = computed(() => {
    const trail = this.override() ?? this.fromRoute();
    return trail.at(-1)?.label ?? HOME_CRUMB.label;
  });

  /** Replace the route-derived trail (after Home) until the next navigation. */
  set(items: BreadcrumbItem[]) {
    this.override.set(items);
  }

  /** Swap only the last crumb's label, e.g. once a record loads. */
  setTitle(label: string) {
    const trail = [...(this.override() ?? this.fromRoute())];
    if (trail.length) trail[trail.length - 1] = { ...trail[trail.length - 1], label };
    else trail.push({ label });
    this.override.set(trail);
  }

  /** Walk the snapshot tree, collecting one crumb per labelled route segment. */
  private build(root: ActivatedRouteSnapshot): BreadcrumbItem[] {
    const crumbs: BreadcrumbItem[] = [];
    let url = '';

    for (let route: ActivatedRouteSnapshot | null = root; route; route = route.firstChild) {
      const segment = route.url.map(s => s.path).join('/');
      if (segment) url += `/${segment}`;

      const label: string | undefined = route.data['breadcrumb'] ?? route.title;
      if (!label) continue;

      // Collapse duplicates produced by a parent and its '' child sharing a label.
      const previous = crumbs.at(-1);
      if (previous?.label === label) {
        previous.link = url;
        continue;
      }
      crumbs.push({ label, link: url });
    }

    delete crumbs.at(-1)?.link;
    return crumbs;
  }
}
