import { AppNotification } from './notification.model';

/** Stands in for the browser's WebSocket in specs: `vi.stubGlobal('WebSocket', FakeSocket)`. */
export class FakeSocket {
  static instances: FakeSocket[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  static get last(): FakeSocket {
    return FakeSocket.instances[FakeSocket.instances.length - 1];
  }

  close() {
    this.closed = true;
  }

  /** The server pushing a notification. */
  push(notification: AppNotification) {
    this.onmessage?.({ data: JSON.stringify({ event: 'notification', notification }) });
  }
}

export function testNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 1,
    type: 'sales_entry',
    severity: 'info',
    title: 'Sales invoice added',
    message: 'SI-000001 to Everest Mart, Rs. 1,130.00.',
    actor: 'Ram',
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
