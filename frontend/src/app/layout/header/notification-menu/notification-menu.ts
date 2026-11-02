import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { BadgeDirective, Button, Icon, IconName, Menu } from '@lumen-ui/angular';
import { NotificationFeed } from './notification-feed';
import { AppNotification, notificationKind } from './notification.model';

/** The header bell: the user's notifications, live from NotificationFeed. A row opens its page. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeDirective, Button, Icon, Menu],
  providers: [NotificationFeed],
  selector: 'app-notification-menu',
  styleUrl: './notification-menu.scss',
  templateUrl: './notification-menu.html',
})
export class NotificationMenu {
  private readonly feed = inject(NotificationFeed);
  private readonly router = inject(Router);
  private readonly menu = viewChild.required(Menu);

  readonly notifications = this.feed.notifications;
  readonly unreadCount = this.feed.unreadCount;
  readonly isEmpty = computed(() => this.notifications().length === 0);

  constructor() {
    this.feed.start();
  }

  open(notification: AppNotification) {
    if (!notification.is_read) this.feed.markRead(notification.id);
    const route = notificationKind(notification).route;
    if (route) {
      this.menu().close();
      this.router.navigateByUrl(route);
    }
  }

  markAllRead() {
    this.feed.markAllRead();
  }

  clearAll() {
    this.feed.clear();
  }

  icon(notification: AppNotification): IconName {
    return notificationKind(notification).icon;
  }

  timeAgo(createdAt: string): string {
    const minutes = Math.max(0, Math.round((Date.now() - Date.parse(createdAt)) / 60_000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }
}
