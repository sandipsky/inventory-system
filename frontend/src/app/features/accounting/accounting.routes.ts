import { Routes } from '@angular/router';
import { permissionGuard } from '../../auth/auth-guard';

export const ACCOUNTING_ROUTES: Routes = [
    {
        path: 'accounts',
        data: { breadcrumb: 'Chart of Accounts', operation: 'ViewAccountMaster' },
        canActivate: [permissionGuard],
        // Add and edit open the form in a right drawer, so there are no child routes.
        loadComponent: () => import('./account/account-list/account-list').then(m => m.AccountList),
    },
    { path: '', redirectTo: 'accounts', pathMatch: 'full' },
];
