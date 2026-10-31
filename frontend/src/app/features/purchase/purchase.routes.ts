import { Routes } from '@angular/router';

export const PURCHASE_ROUTES: Routes = [
    {
        path: 'entry',
        data: { breadcrumb: 'Purchase Entry' },
        // Add, edit and view open the form in a bottom drawer, so there are no child routes.
        loadComponent: () =>
            import('./purchase-entry/purchase-entry-list/purchase-entry-list').then(m => m.PurchaseEntryList),
    },
    {
        path: 'return',
        data: { breadcrumb: 'Purchase Return' },
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./purchase-return/purchase-return-list/purchase-return-list').then(m => m.PurchaseReturnList),
            },
            {
                path: 'new',
                data: { breadcrumb: 'New' },
                loadComponent: () =>
                    import('./purchase-return/purchase-return-form/purchase-return-form').then(m => m.PurchaseReturnForm),
            },
            {
                path: ':id',
                data: { breadcrumb: 'Edit' },
                loadComponent: () =>
                    import('./purchase-return/purchase-return-form/purchase-return-form').then(m => m.PurchaseReturnForm),
            },
        ],
    },
    { path: '', redirectTo: 'entry', pathMatch: 'full' },
];
