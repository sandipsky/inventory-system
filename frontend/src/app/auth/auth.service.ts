import { Service, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthUser } from './auth.model';

@Service()
export class AuthService {
  private readonly router = inject(Router);

  /** The signed-in user, or `null` while logged out. */
  readonly user = signal<AuthUser | null>(null);

  logout() {
    this.user.set(null);
    return this.router.navigate(['/login']);
  }
}
