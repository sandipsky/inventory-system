import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { testToken } from '../../../auth/auth.testing';
import { FakeSocket, testNotification } from './notification-feed.testing';
import { NotificationMenu } from './notification-menu';

const URL = `${environment.apiUrl}/notifications`;

describe('NotificationMenu', () => {
  let component: NotificationMenu;
  let fixture: ComponentFixture<NotificationMenu>;
  let http: HttpTestingController;

  beforeEach(async () => {
    FakeSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeSocket);
    localStorage.setItem('auth_token', testToken());
    await TestBed.configureTestingModule({
      imports: [NotificationMenu],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationMenu);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    FakeSocket.last.onopen?.();
    http.expectOne(URL).flush([
      testNotification({ id: 2, type: 'low_stock', severity: 'warn', title: 'Low stock', actor: null }),
      testNotification({ id: 1, is_read: true }),
    ]);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('shows the feed with its unread count', () => {
    expect(component.notifications().length).toBe(2);
    expect(component.unreadCount()).toBe(1);
    expect(fixture.nativeElement.querySelector('.trigger').getAttribute('aria-label')).toBe('1 unread notifications');
  });

  it('marks an unread notification read and opens its page', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    component.open(component.notifications()[0]);

    http.expectOne({ method: 'PUT', url: `${URL}/2/read` }).flush({});
    expect(navigate).toHaveBeenCalledWith('/inventory/stock-edit');
    expect(component.unreadCount()).toBe(0);
  });

  it('opens a read notification without calling the API again', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    component.open(component.notifications()[1]);

    http.expectNone(`${URL}/1/read`);
    expect(navigate).toHaveBeenCalledWith('/sales/entry');
  });

  it('picks each type its icon, with a fallback for unknown ones', () => {
    expect(component.icon(testNotification({ type: 'out_of_stock' }))).toBe('error');
    expect(component.icon(testNotification({ type: 'something_new' }))).toBe('notification');
  });

  it('clears to the empty state', () => {
    component.clearAll();
    http.expectOne({ method: 'DELETE', url: URL }).flush({});
    expect(component.isEmpty()).toBe(true);
  });

  it('should format relative times', () => {
    const at = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
    expect(component.timeAgo(at(0))).toBe('Just now');
    expect(component.timeAgo(at(5 * 60_000))).toBe('5m ago');
    expect(component.timeAgo(at(3 * 3_600_000))).toBe('3h ago');
    expect(component.timeAgo(at(26 * 3_600_000))).toBe('Yesterday');
    expect(component.timeAgo(at(72 * 3_600_000))).toBe('3d ago');
  });
});
