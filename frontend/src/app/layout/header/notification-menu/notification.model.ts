import { IconName } from '@lumen-ui/angular';

export type NotificationSeverity = 'info' | 'warn' | 'error';

/** A row of `GET /notifications`; new ones arrive over the `/ws/notifications` socket. */
export interface AppNotification {
  id: number;
  /** What it is about, e.g. `sales_entry` or `low_stock` (see NOTIFICATION_KINDS). */
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string | null;
  /** Who did what it reports; `null` for stock alerts. */
  actor: string | null;
  is_read: boolean;
  /** ISO-8601 UTC instant, e.g. `2026-11-02T08:20:00Z`. */
  created_at: string;
}

/** A message on the socket. A notification whose id is already listed replaces it (an updated stock alert). */
export interface NotificationSocketMessage {
  event: 'notification';
  notification: AppNotification;
}

export interface NotificationKind {
  icon: IconName;
  /** The page a row opens. */
  route: string;
  /** Also pops up as a toast when it arrives. */
  toast?: boolean;
}

/** Each backend `type`'s icon and page; an unknown type gets OTHER_KIND. */
export const NOTIFICATION_KINDS: Record<string, NotificationKind> = {
  purchase_entry: { icon: 'cart_add', route: '/purchase/entry' },
  purchase_return: { icon: 'cart_return', route: '/purchase/return' },
  sales_entry: { icon: 'receipt', route: '/sales/entry' },
  sales_return: { icon: 'undo', route: '/sales/return' },
  vendor_payment: { icon: 'money', route: '/accounting/payments' },
  customer_payment: { icon: 'money', route: '/accounting/payments' },
  stock_adjustment: { icon: 'refresh', route: '/inventory/stock-adjustment' },
  low_stock: { icon: 'warning', route: '/inventory/stock-edit', toast: true },
  out_of_stock: { icon: 'error', route: '/inventory/stock-edit', toast: true },
};

export const OTHER_KIND: NotificationKind = { icon: 'notification', route: '' };

export function notificationKind(notification: AppNotification): NotificationKind {
  return NOTIFICATION_KINDS[notification.type] ?? OTHER_KIND;
}
