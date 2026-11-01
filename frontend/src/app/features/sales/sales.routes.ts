import { Routes } from '@angular/router';
import { permissionGuard } from '../../auth/auth-guard';
import { partyRoute } from '../party/party.routes';

export const SALES_ROUTES: Routes = [
    {
        path: 'entry',
        data: { breadcrumb: 'Sales Entry', operation: 'ViewSalesEntries' },
        canActivate: [permissionGuard],
        // Add and view open the form in a bottom drawer, so there are no child routes.
        loadComponent: () =>
            import('./sales-entry/sales-entry-list/sales-entry-list').then(m => m.SalesEntryList),
    },
    {
        path: 'return',
        data: { breadcrumb: 'Sales Return', operation: 'ViewSalesReturns' },
        canActivate: [permissionGuard],
        loadComponent: () =>
            import('./sales-return/sales-return-list/sales-return-list').then(m => m.SalesReturnList),
    },
    partyRoute('customers', 'customer'),
    { path: '', redirectTo: 'entry', pathMatch: 'full' },
];
