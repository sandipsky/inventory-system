import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { authInterceptor } from './auth-interceptor';
import { AuthService } from './auth.service';
import { testToken } from './auth.testing';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  const token = testToken();

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('auth_token', token);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('adds the bearer token to API requests', () => {
    http.get(`${environment.apiUrl}/purchase`).subscribe();
    const req = controller.expectOne(`${environment.apiUrl}/purchase`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({});
  });

  it('leaves the login request and other hosts alone', () => {
    http.post(`${environment.apiUrl}/login`, {}).subscribe();
    http.get('https://example.com/data').subscribe();
    expect(controller.expectOne(`${environment.apiUrl}/login`).request.headers.has('Authorization')).toBe(false);
    expect(controller.expectOne('https://example.com/data').request.headers.has('Authorization')).toBe(false);
  });

  it('ends the session when the API rejects the token', () => {
    const expire = vi.spyOn(TestBed.inject(AuthService), 'expireSession').mockImplementation(() => {});
    http.get(`${environment.apiUrl}/purchase`).subscribe({ error: () => {} });
    controller
      .expectOne(`${environment.apiUrl}/purchase`)
      .flush({ message: 'The JWT token has expired' }, { status: 403, statusText: 'Forbidden' });
    expect(expire).toHaveBeenCalled();
  });

  it('reads the JSON message of a failed file download', async () => {
    const expire = vi.spyOn(TestBed.inject(AuthService), 'expireSession').mockImplementation(() => {});
    const failure = new Promise<HttpErrorResponse>(resolve =>
      http
        .get(`${environment.apiUrl}/purchase/export/pdf`, { responseType: 'blob' })
        .subscribe({ error: resolve }),
    );
    const body = new Blob([JSON.stringify({ message: 'The JWT token has expired' })], { type: 'application/json' });
    controller
      .expectOne(`${environment.apiUrl}/purchase/export/pdf`)
      .flush(body, { status: 403, statusText: 'Forbidden' });

    const error = await failure;
    expect(error.status).toBe(403);
    expect(error.error.message).toBe('The JWT token has expired');
    expect(expire).toHaveBeenCalled();
  });

  it('keeps the session on a permission error', () => {
    const expire = vi.spyOn(TestBed.inject(AuthService), 'expireSession');
    http.delete(`${environment.apiUrl}/purchase/1`).subscribe({ error: () => {} });
    controller
      .expectOne(`${environment.apiUrl}/purchase/1`)
      .flush({ message: 'Operation not allowed' }, { status: 403, statusText: 'Forbidden' });
    expect(expire).not.toHaveBeenCalled();
  });
});
