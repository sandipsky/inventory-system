import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, isObservable } from 'rxjs';
import { environment } from '../../environments/environment';
import { authGuard, guestGuard, permissionGuard } from './auth-guard';
import { AuthService } from './auth.service';
import { testToken, testUser } from './auth.testing';

type GuardResult = boolean | UrlTree;

describe('auth guards', () => {
  let auth: AuthService;

  function run(guard: CanActivateFn, data: Record<string, unknown> = {}, url = '/purchase/entry') {
    const route = { data } as unknown as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => guard(route, state)) as GuardResult | Observable<GuardResult>;
  }

  async function result(value: GuardResult | Observable<GuardResult>): Promise<GuardResult> {
    return isObservable(value) ? firstValueFrom(value) : value;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
  });

  describe('authGuard', () => {
    it('sends anonymous users to login with a return URL', async () => {
      const tree = (await result(run(authGuard))) as UrlTree;
      expect(tree.toString()).toBe('/login?returnUrl=%2Fpurchase%2Fentry');
    });

    it('loads the user before letting a signed-in user through', async () => {
      localStorage.setItem('auth_token', testToken());
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });

      const pending = result(run(authGuard));
      TestBed.inject(HttpTestingController)
        .expectOne(`${environment.apiUrl}/getUserRoleOperations`)
        .flush({ id: 1, username: 'admin', name: null, role_id: 1, role_name: 'Admin', image_url: null,
          master_modules: [], modules: [], operations: [] });

      expect(await pending).toBe(true);
      expect(TestBed.inject(AuthService).user()?.username).toBe('admin');
    });
  });

  describe('guestGuard', () => {
    it('lets anonymous users see the login page', async () => {
      expect(await result(run(guestGuard))).toBe(true);
    });

    it('sends signed-in users to the dashboard', async () => {
      localStorage.setItem('auth_token', testToken());
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
      const tree = (await result(run(guestGuard))) as UrlTree;
      expect(tree.toString()).toBe('/dashboard');
    });
  });

  describe('permissionGuard', () => {
    it('allows routes without an operation', async () => {
      expect(await result(run(permissionGuard))).toBe(true);
    });

    it('allows a granted operation', async () => {
      auth.user.set(testUser({ operations: ['ViewPurchaseEntry'] }));
      expect(await result(run(permissionGuard, { operation: 'ViewPurchaseEntry' }))).toBe(true);
    });

    it('redirects to the dashboard when the operation is missing', async () => {
      auth.user.set(testUser({ operations: ['ViewSalesEntries'] }));
      const tree = (await result(run(permissionGuard, { operation: 'ViewPurchaseEntry' }))) as UrlTree;
      expect(tree.toString()).toBe('/dashboard');
    });

    it('allows any one of several operations', async () => {
      const operation = ['ViewVendorPayment', 'ViewCustomerPayment'];
      auth.user.set(testUser({ operations: ['ViewCustomerPayment'] }));
      expect(await result(run(permissionGuard, { operation }))).toBe(true);

      auth.user.set(testUser({ operations: ['ViewSalesEntries'] }));
      const tree = (await result(run(permissionGuard, { operation }))) as UrlTree;
      expect(tree.toString()).toBe('/dashboard');
    });
  });
});
