import { Route, Routes } from '@angular/router';
import { permissionGuard } from '../../auth/auth-guard';
import { LEDGER_REPORT, REPORTS, REPORT_OPERATIONS } from './report.model';

/**
 * Every table report shares one page; `data.report` (its path) picks the `REPORTS` entry. A report's
 * page sits at its API path: `/reports/purchase/vendor` reads `GET /reports/purchase/vendor`.
 */
function reportRoute(path: string): Route {
  const { title, operation } = REPORTS[path];
  return {
    path,
    data: { breadcrumb: title, operation, report: path },
    canActivate: [permissionGuard],
    loadComponent: () => import('./report-view/report-view').then(m => m.ReportView),
  };
}

export const REPORT_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    // Any role that can open one report gets the page, which lists only the reports it can open.
    data: { operation: REPORT_OPERATIONS },
    canActivate: [permissionGuard],
    loadComponent: () => import('./reports/reports').then(m => m.Reports),
  },
  ...Object.keys(REPORTS).map(reportRoute),
  {
    path: LEDGER_REPORT.path,
    data: { breadcrumb: LEDGER_REPORT.title, operation: LEDGER_REPORT.operation },
    canActivate: [permissionGuard],
    // `?account=` picks the account and `?fromDate=` / `?toDate=` the period, as the trial balance links it.
    loadComponent: () => import('./ledger-report/ledger-report').then(m => m.LedgerReport),
  },
];
