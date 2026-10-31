import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Breadcrumb, Button, Icon, ModalService } from '@lumen-ui/angular';
import { Calculator } from '../../shared/components/calculator/calculator';
import { BreadcrumbService } from '../../shared/services/breadcrumb.service';
import { NotificationMenu } from './notification-menu/notification-menu';
import { ProfileMenu } from './profile-menu/profile-menu';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Breadcrumb, Button, Icon, NotificationMenu, ProfileMenu],
  selector: 'app-header',
  styleUrl: './header.scss',
  templateUrl: './header.html',
})
export class Header {
  private readonly breadcrumb = inject(BreadcrumbService);
  private readonly modal = inject(ModalService);

  readonly title = this.breadcrumb.title;
  readonly crumbs = this.breadcrumb.items;

  openCalculator() {
    this.modal.open(Calculator, { width: '256px', animation: 'fade' });
  }
}
