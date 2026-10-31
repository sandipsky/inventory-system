import { Routes } from '@angular/router';

export const PURCHASE_ROUTES: Routes = [
    {
        path: 'entry',
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./purchase-entry/purchase-entry-list/purchase-entry-list').then(m => m.PurchaseEntryList),
            },
            {
                path: 'new',
                loadComponent: () =>
                    import('./purchase-entry/purchase-entry-form/purchase-entry-form').then(m => m.PurchaseEntryForm),
            },
            {
                path: ':id',
                loadComponent: () =>
                    import('./purchase-entry/purchase-entry-form/purchase-entry-form').then(m => m.PurchaseEntryForm),
            },
        ],
    },
    {
        path: 'return',
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./purchase-return/purchase-return-list/purchase-return-list').then(m => m.PurchaseReturnList),
            },
            {
                path: 'new',
                loadComponent: () =>
                    import('./purchase-return/purchase-return-form/purchase-return-form').then(m => m.PurchaseReturnForm),
            },
            {
                path: ':id',
                loadComponent: () =>
                    import('./purchase-return/purchase-return-form/purchase-return-form').then(m => m.PurchaseReturnForm),
            },
        ],
    },
    { path: '', redirectTo: 'entry', pathMatch: 'full' },
];
