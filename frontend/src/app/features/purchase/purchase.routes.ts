import { Routes } from '@angular/router';
import { permissionGuard } from '../../auth/auth-guard';
import { partyRoute } from '../party/party.routes';

export const PURCHASE_ROUTES: Routes = [
    {
        path: 'entry',
        data: { breadcrumb: 'Purchase Entry', operation: 'ViewPurchaseEntry' },
        canActivate: [permissionGuard],
        // Add, edit and view open the form in a bottom drawer, so there are no child routes.
        loadComponent: () =>
            import('./purchase-entry/purchase-entry-list/purchase-entry-list').then(m => m.PurchaseEntryList),
    },
    {
        path: 'return',
        data: { breadcrumb: 'Purchase Return', operation: 'ViewPurchaseReturn' },
        canActivate: [permissionGuard],
        // The form opens in a bottom drawer from the list.
        loadComponent: () =>
            import('./purchase-return/purchase-return-list/purchase-return-list').then(m => m.PurchaseReturnList),
    },
    partyRoute('vendors', 'vendor'),
    { path: '', redirectTo: 'entry', pathMatch: 'full' },
];
