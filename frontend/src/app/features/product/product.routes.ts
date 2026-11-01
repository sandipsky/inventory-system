import { Routes } from '@angular/router';
import { permissionGuard } from '../../auth/auth-guard';

export const PRODUCT_ROUTES: Routes = [
    {
        path: '',
        data: { operation: 'ViewProduct' },
        canActivate: [permissionGuard],
        // Add, edit and view open the form in a bottom drawer, so there are no child routes.
        loadComponent: () => import('./product-list/product-list').then(m => m.ProductList),
    },
];
