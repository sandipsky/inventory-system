import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { UserAvatar } from './user-avatar';

describe('UserAvatar', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UserAvatar],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    // jsdom has no object URLs.
    URL.createObjectURL = vi.fn(() => 'blob:picture');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => http.verify());

  async function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(UserAvatar);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
    return fixture;
  }

  it('loads the picture with the auth header and frees it when it goes', async () => {
    const fixture = await render({ path: '/uploads/users/a.png', name: 'Sita Sharma' });
    const req = http.expectOne(`${environment.apiUrl}/uploads/users/a.png`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['png']));
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('img')?.getAttribute('src')).toBe('blob:picture');

    fixture.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:picture');
  });

  it('falls back to initials, or an icon when there is no name yet', async () => {
    const named = await render({ path: '/uploads/users/missing.png', name: 'Sita Sharma' });
    http.expectOne(`${environment.apiUrl}/uploads/users/missing.png`).flush(null, { status: 404, statusText: 'Not Found' });
    await named.whenStable();
    expect((named.nativeElement as HTMLElement).textContent).toContain('SS');

    const unnamed = await render({});
    expect((unnamed.nativeElement as HTMLElement).querySelector('.placeholder l-icon')).not.toBeNull();
  });
});
