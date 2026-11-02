import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '@lumen-ui/angular';
import { Observable, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../shared/models/api.model';
import { AuthUser, ChangePasswordRequest, LoginRequest, LoginResponse, UserRoleOperations } from './auth.model';

const TOKEN_KEY = 'auth_token';

/**
 * Holds the JWT from `POST /login` (in localStorage, so a reload keeps the session)
 * and the signed-in user with their permitted operations.
 */
@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  private readonly token = signal<string | null>(readToken());
  private userRequest: Observable<AuthUser> | null = null;

  /** The signed-in user, or `null` until loaded / while logged out. */
  readonly user = signal<AuthUser | null>(null);

  private readonly operations = computed(() => new Set(this.user()?.operations));

  /** The token to send, or `null` when there is none or it has expired. */
  getToken(): string | null {
    const token = this.token();
    return token && !isExpired(token) ? token : null;
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Whether the user's role grants a backend operation such as `CreatePurchaseEntry`;
   * given several, whether it grants any of them.
   */
  hasOperation(operation: string | readonly string[]): boolean {
    const operations = this.operations();
    return typeof operation === 'string' ? operations.has(operation) : operation.some(name => operations.has(name));
  }

  login(credentials: LoginRequest): Observable<AuthUser> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/login`, credentials).pipe(
      tap(({ token }) => this.setToken(token)),
      switchMap(() => this.loadUser()),
    );
  }

  /**
   * Changes the signed-in user's own password. The API checks the current one (a wrong one counts
   * towards the lock, like a failed login); the session stays signed in.
   */
  changePassword(request: ChangePasswordRequest): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${environment.apiUrl}/change-password`, request);
  }

  /** Fetches the user and their operations once per session; later calls reuse it. */
  loadUser(): Observable<AuthUser> {
    const user = this.user();
    if (user) return of(user);

    this.userRequest ??= this.fetchUser().pipe(
      finalize(() => (this.userRequest = null)),
      shareReplay(1),
    );
    return this.userRequest;
  }

  /** Fetches the user again after their own role or profile changed, so menus, buttons and the header follow. */
  refreshUser(): Observable<AuthUser> {
    const previousAvatar = this.user()?.avatarUrl;
    return this.fetchUser().pipe(
      tap(() => {
        if (previousAvatar) URL.revokeObjectURL(previousAvatar);
      }),
    );
  }

  logout() {
    this.clearSession();
    return this.router.navigate(['/login']);
  }

  /** Called by the interceptor when the API rejects the token; returns to the current page after login. */
  expireSession() {
    if (!this.token()) return;
    this.clearSession();
    this.notification.warn('Session expired', 'Please log in again.');
    // Mid-navigation (e.g. the guard loading the user on a fresh page load), return to where it was headed.
    const navigation = this.router.currentNavigation();
    const returnUrl = (navigation?.finalUrl ?? navigation?.extractedUrl)?.toString() ?? this.router.url;
    this.router.navigate(['/login'], { queryParams: returnUrl === '/' ? {} : { returnUrl } });
  }

  /** Forgets the token and user without navigating. */
  clearSession() {
    const avatarUrl = this.user()?.avatarUrl;
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.user.set(null);
  }

  private fetchUser(): Observable<AuthUser> {
    return this.http.get<UserRoleOperations>(`${environment.apiUrl}/getUserRoleOperations`).pipe(
      tap(dto => this.loadAvatar(dto.id, dto.image_url)),
      map(toAuthUser),
      tap(user => this.user.set(user)),
    );
  }

  private setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
  }

  /** The picture endpoint needs the auth header, so it is fetched as a blob instead of an `<img src>`. */
  private loadAvatar(userId: number, path: string | null) {
    if (!path) return;
    this.http.get(`${environment.apiUrl}${path}`, { responseType: 'blob' }).subscribe({
      next: blob => {
        const user = this.user();
        if (user?.id === userId) this.user.set({ ...user, avatarUrl: URL.createObjectURL(blob) });
      },
      // The menu falls back to the placeholder icon.
      error: () => {},
    });
  }
}

function toAuthUser(dto: UserRoleOperations): AuthUser {
  return {
    id: dto.id,
    username: dto.username,
    fullName: dto.name ?? undefined,
    roleId: dto.role_id ?? undefined,
    role: dto.role_name ?? undefined,
    masterModules: dto.master_modules ?? [],
    operations: dto.operations ?? [],
  };
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** True when the JWT's `exp` claim is in the past (or the token can't be read). */
function isExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload)) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
