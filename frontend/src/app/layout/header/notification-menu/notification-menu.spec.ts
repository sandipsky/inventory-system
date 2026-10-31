import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NotificationMenu } from './notification-menu';

describe('NotificationMenu', () => {
  let component: NotificationMenu;
  let fixture: ComponentFixture<NotificationMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationMenu],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create with the dummy feed unread', () => {
    expect(component).toBeTruthy();
    expect(component.notifications().length).toBe(10);
    expect(component.unreadCount()).toBe(10);
  });

  it('should mark a single notification read', () => {
    component.markRead(1);
    expect(component.unreadCount()).toBe(9);
    expect(component.notifications().find(n => n.id === 1)?.read).toBe(true);
  });

  it('should mark everything read', () => {
    component.markAllRead();
    expect(component.unreadCount()).toBe(0);
  });

  it('should clear to the empty state', () => {
    component.clearAll();
    expect(component.isEmpty()).toBe(true);
    expect(component.unreadCount()).toBe(0);
  });

  it('should navigate when a routed notification is opened', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const target = component.notifications().find(n => n.route)!;

    component.open(target);

    expect(navigate).toHaveBeenCalledWith(target.route);
    expect(component.notifications().find(n => n.id === target.id)?.read).toBe(true);
  });

  it('should format relative times', () => {
    const now = Date.now();
    expect(component.timeAgo(new Date(now))).toBe('Just now');
    expect(component.timeAgo(new Date(now - 5 * 60_000))).toBe('5m ago');
    expect(component.timeAgo(new Date(now - 3 * 3_600_000))).toBe('3h ago');
    expect(component.timeAgo(new Date(now - 26 * 3_600_000))).toBe('Yesterday');
    expect(component.timeAgo(new Date(now - 72 * 3_600_000))).toBe('3d ago');
  });
});
