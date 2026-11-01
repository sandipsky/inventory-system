import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NotificationService } from '@lumen-ui/angular';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

/** Lets signed-in users through (loading their permissions first); others go to `/login`. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toLogin = router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

  if (!auth.isLoggedIn()) {
    auth.clearSession();
    return toLogin;
  }
  return auth.loadUser().pipe(
    map(() => true),
    // Drop the token too, or the login page's guestGuard would bounce straight back here.
    catchError(() => {
      auth.clearSession();
      return of(toLogin);
    }),
  );
};

/** Keeps signed-in users off the login page. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).createUrlTree(['/dashboard']) : true;
};

/**
 * Requires the backend operation in the route's `data.operation` (e.g. `ViewPurchaseEntry`),
 * the same one the sidebar uses to show the link. Routes without one are open to any signed-in user.
 */
export const permissionGuard: CanActivateFn = route => {
  const operation: string | undefined = route.data['operation'];
  if (!operation) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  return auth.loadUser().pipe(
    map(() => {
      if (auth.hasOperation(operation)) return true;
      notification.warn('Access denied', `Your role does not allow this page (${operation}).`);
      return router.createUrlTree(['/dashboard']);
    }),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
