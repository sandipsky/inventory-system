import { Routes } from '@angular/router';
import { permissionGuard } from '../../auth/auth-guard';
import { partyRoute } from '../party/party.routes';

export const SALES_ROUTES: Routes = [
    {
        path: 'entry',
        data: { breadcrumb: 'Sales Entry', operation: 'ViewSalesEntries' },
        canActivate: [permissionGuard],
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./sales-entry/sales-entry-list/sales-entry-list').then(m => m.SalesEntryList),
            },
            {
                path: 'new',
                data: { breadcrumb: 'New' },
                loadComponent: () =>
                    import('./sales-entry/sales-entry-form/sales-entry-form').then(m => m.SalesEntryForm),
            },
            {
                path: ':id',
                data: { breadcrumb: 'Edit' },
                loadComponent: () =>
                    import('./sales-entry/sales-entry-form/sales-entry-form').then(m => m.SalesEntryForm),
            },
        ],
    },
    {
        path: 'return',
        data: { breadcrumb: 'Sales Return', operation: 'ViewSalesReturns' },
        canActivate: [permissionGuard],
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./sales-return/sales-return-list/sales-return-list').then(m => m.SalesReturnList),
            },
            {
                path: 'new',
                data: { breadcrumb: 'New' },
                loadComponent: () =>
                    import('./sales-return/sales-return-form/sales-return-form').then(m => m.SalesReturnForm),
            },
            {
                path: ':id',
                data: { breadcrumb: 'Edit' },
                loadComponent: () =>
                    import('./sales-return/sales-return-form/sales-return-form').then(m => m.SalesReturnForm),
            },
        ],
    },
    partyRoute('customers', 'customer'),
    { path: '', redirectTo: 'entry', pathMatch: 'full' },
];
