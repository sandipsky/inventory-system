import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { testToken } from '../auth.testing';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;

  async function setup(returnUrl?: string) {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  function signIn() {
    component.form.setValue({ username: 'admin', password: 'Admin@123' });
    component.submit();
    http.expectOne(`${environment.apiUrl}/login`).flush({ token: testToken() });
    http.expectOne(`${environment.apiUrl}/getUserRoleOperations`).flush({
      id: 1, username: 'admin', name: 'Admin', role_id: 1, role_name: 'Admin', image_url: null,
      master_modules: [], modules: [], operations: [],
    });
  }

  it('does not call the API with empty fields', async () => {
    await setup();
    component.submit();
    http.expectNone(`${environment.apiUrl}/login`);
    expect(component.form.touched).toBe(true);
  });

  it('goes to the dashboard after logging in', async () => {
    await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    signIn();
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('returns to the page the guard came from, but never off-site', async () => {
    await setup('/purchase/entry');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    signIn();
    expect(navigate).toHaveBeenCalledWith('/purchase/entry');

    TestBed.resetTestingModule();
    await setup('//evil.example');
    const again = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    signIn();
    expect(again).toHaveBeenCalledWith('/dashboard');
  });

  it('shows the server message when login fails', async () => {
    await setup();
    component.form.setValue({ username: 'admin', password: 'wrong' });
    component.submit();
    http
      .expectOne(`${environment.apiUrl}/login`)
      .flush({ message: 'Username or Password is Incorrect.' }, { status: 401, statusText: 'Unauthorized' });

    expect(component.error()).toBe('Username or Password is Incorrect.');
    expect(component.submitting()).toBe(false);
  });
});
