import { Route, Routes } from '@angular/router';
import { permissionGuard } from '../../auth/auth-guard';
import { MASTERS, MasterKind } from './masters.model';

/** Every master shares one list page; `data.master` tells it which. Add and edit open in a right drawer. */
function masterRoute(path: string, kind: MasterKind): Route {
  const { plural, operation } = MASTERS[kind];
  return {
    path,
    data: { breadcrumb: plural, operation: `View${operation}`, master: kind },
    canActivate: [permissionGuard],
    loadComponent: () => import('./master-list/master-list').then(m => m.MasterList),
  };
}

export const MASTER_ROUTES: Routes = [
  masterRoute('categories', 'category'),
  masterRoute('units', 'unit'),
  masterRoute('packings', 'packing'),
  masterRoute('tax-types', 'taxType'),
  { path: '', redirectTo: 'categories', pathMatch: 'full' },
];
