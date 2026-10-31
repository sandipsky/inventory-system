import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { BadgeDirective, Button, Icon, Menu } from '@lumen-ui/angular';
import { DUMMY_NOTIFICATIONS } from './notification-menu.data';
import { AppNotification } from './notification.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeDirective, Button, Icon, Menu],
  selector: 'app-notification-menu',
  styleUrl: './notification-menu.scss',
  templateUrl: './notification-menu.html',
})
export class NotificationMenu {
  private readonly router = inject(Router);
  private readonly menu = viewChild.required(Menu);

  // TODO: replace with a notifications service once the backend exposes a feed.
  readonly notifications = signal<AppNotification[]>(DUMMY_NOTIFICATIONS);

  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);
  readonly isEmpty = computed(() => this.notifications().length === 0);

  open(notification: AppNotification) {
    this.markRead(notification.id);
    if (notification.route) {
      this.menu().close();
      this.router.navigateByUrl(notification.route);
    }
  }

  markRead(id: number) {
    this.notifications.update(list => list.map(n => (n.id === id ? { ...n, read: true } : n)));
  }

  markAllRead() {
    this.notifications.update(list => list.map(n => (n.read ? n : { ...n, read: true })));
  }

  clearAll() {
    this.notifications.set([]);
  }

  timeAgo(date: Date): string {
    const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }
}
