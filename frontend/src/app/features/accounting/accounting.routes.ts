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
    {
        path: 'journal',
        data: { breadcrumb: 'Journal Entries', operation: 'ViewJournalEntries' },
        canActivate: [permissionGuard],
        // Add, edit and view open the form in a bottom drawer, so there are no child routes.
        loadComponent: () => import('./journal/journal-list/journal-list').then(m => m.JournalList),
    },
    {
        path: 'payments',
        // Vendor and customer payments share the page; either view operation lets you in.
        data: { breadcrumb: 'Payments', operation: ['ViewVendorPayment', 'ViewCustomerPayment'] },
        canActivate: [permissionGuard],
        loadComponent: () => import('./payment/payment-list/payment-list').then(m => m.PaymentList),
    },
    {
        path: 'payment-adjustment',
        data: { breadcrumb: 'Payment Adjustments', operation: 'ViewPaymentAdjustment' },
        canActivate: [permissionGuard],
        loadComponent: () =>
            import('./payment-adjustment/payment-adjustment-list/payment-adjustment-list').then(
                m => m.PaymentAdjustmentList,
            ),
    },
    {
        path: 'opening-balance',
        data: { breadcrumb: 'Opening Balance', operation: 'ViewOpeningBalance' },
        canActivate: [permissionGuard],
        loadComponent: () =>
            import('./opening-balance/opening-balance-form/opening-balance-form').then(m => m.OpeningBalanceForm),
    },
    { path: '', redirectTo: 'accounts', pathMatch: 'full' },
];
