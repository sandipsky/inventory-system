import { Routes } from '@angular/router';

export const SALES_ROUTES: Routes = [
    {
        path: 'entry',
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./sales-entry/sales-entry-list/sales-entry-list').then(m => m.SalesEntryList),
            },
            {
                path: 'new',
                loadComponent: () =>
                    import('./sales-entry/sales-entry-form/sales-entry-form').then(m => m.SalesEntryForm),
            },
            {
                path: ':id',
                loadComponent: () =>
                    import('./sales-entry/sales-entry-form/sales-entry-form').then(m => m.SalesEntryForm),
            },
        ],
    },
    {
        path: 'return',
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./sales-return/sales-return-list/sales-return-list').then(m => m.SalesReturnList),
            },
            {
                path: 'new',
                loadComponent: () =>
                    import('./sales-return/sales-return-form/sales-return-form').then(m => m.SalesReturnForm),
            },
            {
                path: ':id',
                loadComponent: () =>
                    import('./sales-return/sales-return-form/sales-return-form').then(m => m.SalesReturnForm),
            },
        ],
    },
    { path: '', redirectTo: 'entry', pathMatch: 'full' },
];
