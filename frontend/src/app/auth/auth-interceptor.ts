import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

const LOGIN_URL = `${environment.apiUrl}/login`;

/**
 * Sends `Authorization: Bearer <jwt>` on every API request and ends the session
 * when the API rejects the token: 401 for a missing one, 403 "The JWT token has
 * expired", or 500 "JWT signature does not match…" (e.g. after the server's key
 * changed). A plain 403 ("Operation not allowed") is a permission error and is
 * left to the caller.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl) || req.url === LOGIN_URL) return next(req);

  const auth = inject(AuthService);
  const token = auth.getToken();
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && isSessionError(error)) auth.expireSession();
      return throwError(() => error);
    }),
  );
};

function isSessionError(error: HttpErrorResponse): boolean {
  if (error.status === 401) return true;
  const message: unknown = error.error?.message;
  return typeof message === 'string' && /jwt|token|authorization header/i.test(message);
}
