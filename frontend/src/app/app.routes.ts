import { Routes } from '@angular/router';
import { Layout } from './layout/layout';
import { authGuard, guestGuard } from './auth/auth-guard';

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
            {
                path: 'accounting',
                data: { breadcrumb: 'Accounting' },
                loadChildren: () => import('./features/accounting/accounting.routes').then(m => m.ACCOUNTING_ROUTES),
            },
            {
                path: 'products',
                data: { breadcrumb: 'Products' },
                loadChildren: () => import('./features/product/product.routes').then(m => m.PRODUCT_ROUTES),
            },
            {
                path: 'masters',
                data: { breadcrumb: 'Master Data' },
                loadChildren: () => import('./features/masters/masters.routes').then(m => m.MASTER_ROUTES),
            },
            {
                path: 'user-roles',
                data: { breadcrumb: 'User & Roles' },
                loadChildren: () => import('./features/user-roles/user-roles.routes').then(m => m.USER_ROLES_ROUTES),
            },
            {
                path: 'settings',
                data: { breadcrumb: 'Settings' },
                loadChildren: () => import('./features/settings/settings.routes').then(m => m.SETTINGS_ROUTES),
            },
        ],
    },
    {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./auth/login/login').then(m => m.Login),
    },
    { path: '**', redirectTo: 'dashboard' },
];
