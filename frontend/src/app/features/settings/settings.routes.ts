import { Routes } from '@angular/router';
import { permissionGuard } from '../../auth/auth-guard';

export const SETTINGS_ROUTES: Routes = [
    {
        path: 'configuration',
        data: { breadcrumb: 'Configuration', operation: 'ViewConfiguration' },
        canActivate: [permissionGuard],
        // The settings show read-only and switch to editing in place, so there are no child routes.
        loadComponent: () => import('./configuration/configuration-form/configuration-form').then(m => m.ConfigurationForm),
    },
    {
        path: 'document-numbering',
        data: { breadcrumb: 'Document Numbering', operation: 'ViewDocumentNumbering' },
        canActivate: [permissionGuard],
        loadComponent: () =>
            import('./document-numbering/document-numbering-list/document-numbering-list').then(m => m.DocumentNumberingList),
    },
    { path: '', redirectTo: 'configuration', pathMatch: 'full' },
];
