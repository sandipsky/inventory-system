import { Routes } from '@angular/router';
import { permissionGuard } from '../../auth/auth-guard';

export const INVENTORY_ROUTES: Routes = [
    {
        path: 'opening-stock',
        data: { breadcrumb: 'Opening Stock', operation: 'ViewOpeningStock' },
        canActivate: [permissionGuard],
        // Add opens the form in a right drawer, so there are no child routes.
        loadComponent: () =>
            import('./opening-stock/opening-stock-list/opening-stock-list').then(m => m.OpeningStockList),
    },
    {
        path: 'stock-adjustment',
        data: { breadcrumb: 'Stock Adjustment', operation: 'ViewStockAdjustment' },
        canActivate: [permissionGuard],
        // Add, edit and view open the form in a bottom drawer, so there are no child routes.
        loadComponent: () =>
            import('./stock-adjustment/stock-adjustment-list/stock-adjustment-list').then(m => m.StockAdjustmentList),
    },
    {
        path: 'stock-edit',
        data: { breadcrumb: 'Stock Edit', operation: 'ViewStockEdit' },
        canActivate: [permissionGuard],
        // Edit opens the form in a right drawer.
        loadComponent: () => import('./stock-edit/stock-edit-list/stock-edit-list').then(m => m.StockEditList),
    },
    { path: '', redirectTo: 'opening-stock', pathMatch: 'full' },
];
