import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Layout } from './layout/layout';
import { authGuard } from './auth/auth-guard';

export const routes: Routes = [
    {
        path: '',
        component: Layout,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                data: { breadcrumb: 'Dashboard' },
                loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
            },
            {
                path: 'purchase',
                data: { breadcrumb: 'Purchase' },
                loadChildren: () => import('./features/purchase/purchase.routes').then(m => m.PURCHASE_ROUTES),
            },
            {
                path: 'sales',
                data: { breadcrumb: 'Sales' },
                loadChildren: () => import('./features/sales/sales.routes').then(m => m.SALES_ROUTES),
            },
        ],
    },
    {
        path: 'login', component: Login
    },
    { path: '**', redirectTo: 'dashboard' },
];
