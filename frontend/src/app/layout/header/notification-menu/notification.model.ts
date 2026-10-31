import { IconName } from '@lumen-ui/angular';

export type NotificationTone = 'info' | 'success' | 'warn' | 'error';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  icon: IconName;
  tone: NotificationTone;
  /** When it happened. */
  createdAt: Date;
  read: boolean;
  /** Optional page to open when the row is clicked. */
  route?: string;
}
