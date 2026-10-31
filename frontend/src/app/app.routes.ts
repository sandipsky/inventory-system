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
                loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
            },
            {
                path: 'purchase',
                loadChildren: () => import('./features/purchase/purchase.routes').then(m => m.PURCHASE_ROUTES),
            },
            {
                path: 'sales',
                loadChildren: () => import('./features/sales/sales.routes').then(m => m.SALES_ROUTES),
            },
        ],
    },
    {
        path: 'login', component: Login
    },
    { path: '**', redirectTo: 'dashboard' },
];
