import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

const LOGIN_URL = `${environment.apiUrl}/login`;

/**
 * Sends `Authorization: Bearer <jwt>` on every API request and ends the session
 * when the API rejects the token: 401 for a missing one, 403 "The JWT token has
 * expired", or 500 "JWT signature does not match…" (e.g. after the server's key
 * changed). A plain 403 ("Operation not allowed") is a permission error and is
 * left to the caller. A file download's error arrives as a Blob; it is read as the
 * API's JSON first, so these checks and the caller see its `message`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl) || req.url === LOGIN_URL) return next(req);

  const auth = inject(AuthService);
  const token = auth.getToken();
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  const fail = (error: unknown) => {
    if (error instanceof HttpErrorResponse && isSessionError(error)) auth.expireSession();
    return throwError(() => error);
  };

  return next(request).pipe(
    catchError((error: unknown) =>
      error instanceof HttpErrorResponse && error.error instanceof Blob
        ? from(withJsonBody(error)).pipe(switchMap(fail))
        : fail(error),
    ),
  );
};

/** The error with its Blob body parsed as JSON; unchanged when the body isn't JSON. */
async function withJsonBody(error: HttpErrorResponse): Promise<HttpErrorResponse> {
  try {
    return new HttpErrorResponse({
      error: JSON.parse(await (error.error as Blob).text()),
      headers: error.headers,
      status: error.status,
      statusText: error.statusText,
      url: error.url ?? undefined,
    });
  } catch {
    return error;
  }
}

function isSessionError(error: HttpErrorResponse): boolean {
  if (error.status === 401) return true;
  const message: unknown = error.error?.message;
  return typeof message === 'string' && /jwt|token|authorization header/i.test(message);
}
