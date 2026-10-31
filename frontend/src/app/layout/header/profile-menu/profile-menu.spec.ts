import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { ProfileMenu } from './profile-menu';

describe('ProfileMenu', () => {
  let component: ProfileMenu;
  let fixture: ComponentFixture<ProfileMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileMenu],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the user icon when there is no profile picture', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.trigger l-avatar')).toBeNull();
    expect(el.querySelector('.trigger .placeholder l-icon')).not.toBeNull();
  });

  it('should show the avatar image when a profile picture is set', async () => {
    TestBed.inject(AuthService).user.set({ username: 'jane', fullName: 'Jane Doe', avatarUrl: 'assets/jane.png' });
    fixture.detectChanges();
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.trigger l-avatar')).not.toBeNull();
    expect(el.querySelector('.trigger .placeholder')).toBeNull();
  });

  it('should fall back to username and a placeholder role', () => {
    TestBed.inject(AuthService).user.set({ username: 'admin' });
    expect(component.name()).toBe('admin');
    expect(component.role()).toBe('No role assigned');

    TestBed.inject(AuthService).user.set({ username: 'admin', fullName: 'Admin User', role: 'Administrator' });
    expect(component.name()).toBe('Admin User');
    expect(component.role()).toBe('Administrator');
  });

  it('should clear the user and go to login on logout', async () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    auth.user.set({ username: 'jane' });

    component.logout();

    expect(auth.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
