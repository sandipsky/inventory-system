import { HttpErrorResponse } from '@angular/common/http';

/** The backend's `message` from an error response, or `fallback` when there is none. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Cannot reach the server. Check that the backend is running.';
    const message = error.error?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}
