import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Avatar, Button, Icon, Menu } from '@lumen-ui/angular';
import { AuthService } from '../../../auth/auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar, Button, Icon, Menu],
  selector: 'app-profile-menu',
  styleUrl: './profile-menu.scss',
  templateUrl: './profile-menu.html',
})
export class ProfileMenu {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.auth.user;
  readonly avatarUrl = computed(() => this.user()?.avatarUrl ?? '');
  readonly name = computed(() => {
    const user = this.user();
    return user?.fullName || user?.username || 'Account';
  });
  readonly role = computed(() => this.user()?.role || 'No role assigned');

  changePassword() {
    // TODO: point at the change-password page once it exists.
    this.router.navigate(['/change-password']);
  }

  logout() {
    this.auth.logout();
  }
}
