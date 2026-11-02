import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Breadcrumb, Button, DrawerService, Icon, ModalService } from '@lumen-ui/angular';
import { AuthService } from '../../auth/auth.service';
import { Calculator } from '../../shared/components/calculator/calculator';
import { BreadcrumbService } from '../../shared/services/breadcrumb.service';
import { NotificationMenu } from './notification-menu/notification-menu';
import { ProfileMenu } from './profile-menu/profile-menu';
import { RangePrint } from './range-print/range-print';
import { RANGE_PRINT_OPTIONS } from './range-print/range-print.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Breadcrumb, Button, Icon, NotificationMenu, ProfileMenu],
  selector: 'app-header',
  styleUrl: './header.scss',
  templateUrl: './header.html',
})
export class Header {
  private readonly auth = inject(AuthService);
  private readonly breadcrumb = inject(BreadcrumbService);
  private readonly drawer = inject(DrawerService);
  private readonly modal = inject(ModalService);

  readonly title = this.breadcrumb.title;
  readonly crumbs = this.breadcrumb.items;

  /** Range Print shows when the role may view at least one of the documents it prints. */
  readonly canRangePrint = computed(() =>
    RANGE_PRINT_OPTIONS.some(option => this.auth.hasOperation(option.operation)),
  );

  openCalculator() {
    this.modal.open(Calculator, { width: '256px', animation: 'fade' });
  }

  openRangePrint() {
    this.drawer.open(RangePrint, { position: 'right', size: '350px' });
  }
}
