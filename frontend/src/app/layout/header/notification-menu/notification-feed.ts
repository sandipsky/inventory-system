import { HttpClient } from '@angular/common/http';
import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import { NotificationRef, NotificationService } from '@lumen-ui/angular';
import { Observable, Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';
import { ApiResponse } from '../../../shared/models/api.model';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { AppNotification, NotificationSocketMessage, notificationKind } from './notification.model';

/** The API's feed size; live ones are kept to it too. */
const FEED_SIZE = 50;
/** Reconnect delays double from the first to the last. */
const RETRY_FIRST_MS = 1_000;
const RETRY_LAST_MS = 30_000;

/** `ws://host/ws/notifications` (`wss://` behind https), on the API's host and port. */
export const SOCKET_URL = `${environment.apiUrl.replace(/^http/, 'ws')}/ws/notifications`;

/**
 * The signed-in user's notifications (`/notifications`), kept live over the `/ws/notifications`
 * socket. Each time the socket opens the list is reloaded, so nothing sent while it was down is
 * missed; when it drops it reconnects while the session lasts. Not a singleton: NotificationMenu
 * lists it in its own `providers`, so the socket closes with the shell on logout.
 */
@Service({ autoProvided: false })
export class NotificationFeed {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(NotificationService);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.is_read).length);

  private socket: WebSocket | null = null;
  private retryDelay = RETRY_FIRST_MS;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private started = false;
  private loaded = false;
  private loading: Subscription | null = null;
  /** Arrived while a reload was on its way; merged into its result. */
  private arrivedDuringLoad: AppNotification[] = [];
  /** The toast each stock alert last showed, so an updated alert replaces it. */
  private readonly toasts = new Map<number, NotificationRef>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.connect();
  }

  markRead(id: number) {
    this.notifications.update(list => list.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    this.send(this.http.put<ApiResponse>(`${this.baseUrl}/${id}/read`, null), 'Could not mark it read');
  }

  markAllRead() {
    this.notifications.update(list => list.map(n => (n.is_read ? n : { ...n, is_read: true })));
    this.send(this.http.put<ApiResponse>(`${this.baseUrl}/read`, null), 'Could not mark them read');
  }

  clear() {
    this.notifications.set([]);
    this.send(this.http.delete<ApiResponse>(this.baseUrl), 'Could not clear them');
  }

  private connect() {
    const token = this.auth.getToken();
    if (!this.started || !token) return;

    const socket = new WebSocket(`${SOCKET_URL}?token=${encodeURIComponent(token)}`);
    this.socket = socket;
    socket.onopen = () => {
      this.retryDelay = RETRY_FIRST_MS;
      this.load();
    };
    socket.onmessage = event => this.receive(event.data);
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      // The socket never opened: still show what is stored.
      if (!this.loaded) this.load();
      this.retryTimer = setTimeout(() => this.connect(), this.retryDelay);
      this.retryDelay = Math.min(this.retryDelay * 2, RETRY_LAST_MS);
    };
  }

  private stop() {
    this.started = false;
    clearTimeout(this.retryTimer);
    this.loading?.unsubscribe();
    const socket = this.socket;
    this.socket = null;
    socket?.close();
  }

  private load() {
    this.loading?.unsubscribe();
    this.arrivedDuringLoad = [];
    this.loading = this.http.get<AppNotification[]>(this.baseUrl).subscribe({
      next: list => {
        this.loaded = true;
        this.notifications.set(this.arrivedDuringLoad.reduce(upsert, list));
      },
      // Keeps what is shown; the next reconnect tries again.
      error: () => {},
    });
  }

  private receive(data: unknown) {
    let message: NotificationSocketMessage;
    try {
      message = JSON.parse(String(data)) as NotificationSocketMessage;
    } catch {
      return;
    }
    if (message.event !== 'notification') return;

    const notification = message.notification;
    this.arrivedDuringLoad.push(notification);
    this.notifications.update(list => upsert(list, notification));
    if (notificationKind(notification).toast) {
      const text = notification.message ?? undefined;
      this.toasts.get(notification.id)?.dismiss();
      this.toasts.set(
        notification.id,
        notification.severity === 'error'
          ? this.toast.error(notification.title, text)
          : this.toast.warn(notification.title, text),
      );
    }
  }

  /** Read and clear update the list at once; a failure says so and reloads what is stored. */
  private send(request: Observable<ApiResponse>, failure: string) {
    request.subscribe({
      error: (error: unknown) => {
        this.toast.error(failure, apiErrorMessage(error));
        this.load();
      },
    });
  }
}

/** Puts the notification first, replacing the one with its id. */
function upsert(list: AppNotification[], notification: AppNotification): AppNotification[] {
  return [notification, ...list.filter(n => n.id !== notification.id)].slice(0, FEED_SIZE);
}
