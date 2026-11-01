import { Routes } from '@angular/router';
import { permissionGuard } from '../../auth/auth-guard';

export const USER_ROLES_ROUTES: Routes = [
    {
        path: 'users',
        data: { breadcrumb: 'Users', operation: 'ViewUser' },
        canActivate: [permissionGuard],
        // Add and edit open the form in a right drawer, so there are no child routes.
        loadComponent: () => import('./user/user-list/user-list').then(m => m.UserList),
    },
    {
        path: 'roles',
        data: { breadcrumb: 'Roles', operation: 'ViewRole' },
        canActivate: [permissionGuard],
        loadComponent: () => import('./role/role-list/role-list').then(m => m.RoleList),
    },
    { path: '', redirectTo: 'users', pathMatch: 'full' },
];
