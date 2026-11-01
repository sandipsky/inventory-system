import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { testToken, testUser } from './auth.testing';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('logs in, stores the token and loads the user', () => {
    const token = testToken();
    let name: string | undefined;
    service.login({ username: 'admin', password: 'secret' }).subscribe(user => (name = user.fullName));

    const login = http.expectOne(`${environment.apiUrl}/login`);
    expect(login.request.body).toEqual({ username: 'admin', password: 'secret' });
    login.flush({ token });

    http.expectOne(`${environment.apiUrl}/getUserRoleOperations`).flush({
      id: 1,
      username: 'admin',
      name: 'Admin',
      role_id: 1,
      role_name: 'Administrator',
      image_url: null,
      master_modules: ['Purchase'],
      modules: ['PurchaseEntry'],
      operations: ['ViewPurchaseEntry'],
    });

    expect(name).toBe('Admin');
    expect(localStorage.getItem('auth_token')).toBe(token);
    expect(service.getToken()).toBe(token);
    expect(service.user()?.role).toBe('Administrator');
    expect(service.hasOperation('ViewPurchaseEntry')).toBe(true);
    expect(service.hasOperation('DeletePurchaseEntry')).toBe(false);
    // Several: any one of them is enough.
    expect(service.hasOperation(['DeletePurchaseEntry', 'ViewPurchaseEntry'])).toBe(true);
    expect(service.hasOperation(['DeletePurchaseEntry', 'EditPurchaseEntry'])).toBe(false);
  });

  it('loads the user only once', () => {
    service.loadUser().subscribe();
    service.loadUser().subscribe();
    http.expectOne(`${environment.apiUrl}/getUserRoleOperations`).flush({
      id: 1, username: 'admin', name: null, role_id: null, role_name: null, image_url: null,
      master_modules: [], modules: [], operations: [],
    });

    let calls = 0;
    service.loadUser().subscribe(() => calls++);
    expect(calls).toBe(1);
  });

  it('refetches the user when asked, e.g. after their role changed', () => {
    service.loadUser().subscribe();
    http.expectOne(`${environment.apiUrl}/getUserRoleOperations`).flush({
      id: 1, username: 'admin', name: null, role_id: 1, role_name: 'Admin', image_url: null,
      master_modules: [], modules: [], operations: ['ViewRole', 'EditRole'],
    });
    expect(service.user()?.roleId).toBe(1);

    service.refreshUser().subscribe();
    http.expectOne(`${environment.apiUrl}/getUserRoleOperations`).flush({
      id: 1, username: 'admin', name: null, role_id: 1, role_name: 'Admin', image_url: null,
      master_modules: [], modules: [], operations: ['ViewRole'],
    });
    expect(service.hasOperation('EditRole')).toBe(false);
  });

  it('treats an expired token as logged out', () => {
    localStorage.setItem('auth_token', testToken(-60));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fresh = TestBed.inject(AuthService);
    expect(fresh.isLoggedIn()).toBe(false);
    expect(fresh.getToken()).toBeNull();
  });

  it('clears the session and goes to login on logout', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    localStorage.setItem('auth_token', testToken());
    service.user.set(testUser());

    service.logout();

    expect(service.user()).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
