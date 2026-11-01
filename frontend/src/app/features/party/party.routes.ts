import { Route } from '@angular/router';
import { permissionGuard } from '../../auth/auth-guard';
import { PARTIES, PartyKind } from './party.model';

/**
 * The vendor or customer list page, mounted under purchase and sales; `data.party` tells the
 * shared list which. Add and edit open in a right drawer, so there are no child routes.
 */
export function partyRoute(path: string, kind: PartyKind): Route {
  const { plural, operation } = PARTIES[kind];
  return {
    path,
    data: { breadcrumb: plural, operation: `View${operation}`, party: kind },
    canActivate: [permissionGuard],
    loadComponent: () => import('./party-list/party-list').then(m => m.PartyList),
  };
}
