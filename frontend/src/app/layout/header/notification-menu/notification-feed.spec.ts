import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationRef, NotificationService } from '@lumen-ui/angular';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';
import { testToken } from '../../../auth/auth.testing';
import { NotificationFeed } from './notification-feed';
import { FakeSocket, testNotification } from './notification-feed.testing';

const URL = `${environment.apiUrl}/notifications`;

describe('NotificationFeed', () => {
  let feed: NotificationFeed;
  let http: HttpTestingController;
  let token: string;

  beforeEach(() => {
    FakeSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeSocket);
    token = testToken();
    localStorage.setItem('auth_token', token);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), NotificationFeed],
    });
    feed = TestBed.inject(NotificationFeed);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  /** Starts the feed, opens its socket and answers the load. */
  function open(list = [testNotification()]) {
    feed.start();
    FakeSocket.last.onopen?.();
    http.expectOne(URL).flush(list);
  }

  it('opens the socket with the token, then loads the stored list', () => {
    feed.start();

    expect(FakeSocket.last.url).toBe(`ws://localhost:8080/ws/notifications?token=${token}`);
    http.expectNone(URL);

    FakeSocket.last.onopen?.();
    http.expectOne(URL).flush([testNotification({ id: 2 }), testNotification({ id: 1, is_read: true })]);

    expect(feed.notifications().map(n => n.id)).toEqual([2, 1]);
    expect(feed.unreadCount()).toBe(1);
  });

  it('puts a pushed notification first and replaces one with the same id', () => {
    open([testNotification({ id: 1 })]);

    FakeSocket.last.push(testNotification({ id: 2, type: 'low_stock', message: 'Pencil is down to 9.' }));
    FakeSocket.last.push(testNotification({ id: 3 }));
    FakeSocket.last.push(testNotification({ id: 2, type: 'low_stock', message: 'Pencil is down to 8.' }));

    expect(feed.notifications().map(n => n.id)).toEqual([2, 3, 1]);
    expect(feed.notifications()[0].message).toBe('Pencil is down to 8.');
  });

  it('pops up stock alerts only', () => {
    const toast = TestBed.inject(NotificationService);
    const warn = vi.spyOn(toast, 'warn');
    const error = vi.spyOn(toast, 'error');
    open([]);

    FakeSocket.last.push(testNotification({ id: 1 }));
    FakeSocket.last.push(testNotification({ id: 2, type: 'low_stock', severity: 'warn', title: 'Low stock', message: 'Low' }));
    FakeSocket.last.push(testNotification({ id: 3, type: 'out_of_stock', severity: 'error', title: 'Out of stock', message: 'None' }));

    expect(warn).toHaveBeenCalledExactlyOnceWith('Low stock', 'Low');
    expect(error).toHaveBeenCalledExactlyOnceWith('Out of stock', 'None');
  });

  it('replaces the toast of a stock alert that is updated', () => {
    const toast = TestBed.inject(NotificationService);
    const first = { id: 1, dismiss: vi.fn() } as unknown as NotificationRef;
    vi.spyOn(toast, 'warn').mockReturnValueOnce(first);
    open([]);

    FakeSocket.last.push(testNotification({ id: 7, type: 'low_stock', severity: 'warn' }));
    FakeSocket.last.push(testNotification({ id: 7, type: 'low_stock', severity: 'warn' }));

    expect(first.dismiss).toHaveBeenCalledOnce();
    expect(toast.warn).toHaveBeenCalledTimes(2);
  });

  it('keeps what arrives while the list is loading', () => {
    feed.start();
    FakeSocket.last.onopen?.();
    FakeSocket.last.push(testNotification({ id: 5 }));

    http.expectOne(URL).flush([testNotification({ id: 4 })]);

    expect(feed.notifications().map(n => n.id)).toEqual([5, 4]);
  });

  it('reconnects with a growing delay and reloads once open again', () => {
    vi.useFakeTimers();
    open();

    FakeSocket.last.onclose?.();
    vi.advanceTimersByTime(999);
    expect(FakeSocket.instances.length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances.length).toBe(2);

    FakeSocket.last.onclose?.();
    vi.advanceTimersByTime(1999);
    expect(FakeSocket.instances.length).toBe(2);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances.length).toBe(3);

    FakeSocket.last.onopen?.();
    http.expectOne(URL).flush([]);
    expect(feed.notifications()).toEqual([]);
  });

  it('stops reconnecting once the session has ended', () => {
    vi.useFakeTimers();
    open();
    TestBed.inject(AuthService).clearSession();

    FakeSocket.last.onclose?.();
    vi.advanceTimersByTime(60_000);

    expect(FakeSocket.instances.length).toBe(1);
  });

  it('still loads the stored list when the socket cannot open', () => {
    feed.start();
    FakeSocket.last.onclose?.();

    http.expectOne(URL).flush([testNotification()]);

    expect(feed.notifications().length).toBe(1);
  });

  it('marks read and clears through the API', () => {
    open([testNotification({ id: 1 }), testNotification({ id: 2 })]);

    feed.markRead(1);
    http.expectOne({ method: 'PUT', url: `${URL}/1/read` }).flush({});
    expect(feed.unreadCount()).toBe(1);

    feed.markAllRead();
    http.expectOne({ method: 'PUT', url: `${URL}/read` }).flush({});
    expect(feed.unreadCount()).toBe(0);

    feed.clear();
    http.expectOne({ method: 'DELETE', url: URL }).flush({});
    expect(feed.notifications()).toEqual([]);
  });

  it('says so and reloads when clearing fails', () => {
    const error = vi.spyOn(TestBed.inject(NotificationService), 'error');
    open();

    feed.clear();
    http.expectOne({ method: 'DELETE', url: URL }).flush({ message: 'Database is locked' }, { status: 500, statusText: 'Error' });

    expect(error).toHaveBeenCalledWith('Could not clear them', 'Database is locked');
    http.expectOne(URL).flush([testNotification()]);
    expect(feed.notifications().length).toBe(1);
  });

  it('closes the socket when the shell goes away', () => {
    open();
    const socket = FakeSocket.last;

    TestBed.resetTestingModule();

    expect(socket.closed).toBe(true);
  });
});
