import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationService } from '@lumen-ui/angular';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';
import { testUser } from '../auth.testing';
import { ChangePassword } from './change-password';

describe('ChangePassword', () => {
  const url = `${environment.apiUrl}/change-password`;
  let fixture: ComponentFixture<ChangePassword>;
  let component: ChangePassword;
  let http: HttpTestingController;
  const notification = { success: vi.fn(), error: vi.fn() };

  beforeEach(async () => {
    notification.success.mockClear();
    notification.error.mockClear();
    await TestBed.configureTestingModule({
      imports: [ChangePassword],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notification },
      ],
    }).compileComponents();
    TestBed.inject(AuthService).user.set(testUser({ fullName: 'Sita Sharma' }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ChangePassword);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const fill = (current: string, next: string, confirm: string) =>
    component.form.setValue({ current_password: current, new_password: next, confirm_password: confirm });
  const alerts = () =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('.field .alert')].map(el => el.textContent?.trim());

  it('sends the current and new password, then clears the form', () => {
    fill('Old@1234', 'New@5678', 'New@5678');
    component.save();

    const req = http.expectOne(url);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ current_password: 'Old@1234', new_password: 'New@5678' });
    req.flush({ success: true, message: 'Password changed successfully', errorCode: 0, timestamp: 0, post_data_id: 1 });

    expect(notification.success).toHaveBeenCalledWith('Password changed', 'Password changed successfully');
    expect(component.form.getRawValue()).toEqual({ current_password: '', new_password: '', confirm_password: '' });
    expect(component.saving()).toBe(false);
  });

  it('sends nothing while the confirmation differs or the password is unchanged or weak', async () => {
    fill('Old@1234', 'New@5678', 'New@5679');
    component.save();
    await fixture.whenStable();
    expect(alerts()).toEqual(["The passwords don't match."]);

    fill('Old@1234', 'Old@1234', 'Old@1234');
    component.save();
    await fixture.whenStable();
    expect(alerts()).toEqual(['Use a password different from the current one.']);

    fill('Old@1234', 'weakpass', 'weakpass');
    component.save();
    http.expectNone(url);
  });

  it("shows the API's message when the change fails", () => {
    fill('wrong', 'New@5678', 'New@5678');
    component.save();

    http.expectOne(url).flush(
      { success: false, message: 'Current password is incorrect', errorCode: 400 },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(notification.error).toHaveBeenCalledWith('Could not change password', 'Current password is incorrect');
    expect(component.form.getRawValue().current_password).toBe('wrong');
  });

  it('names the signed-in user', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('.subtitle')?.textContent).toContain('Sita Sharma');
  });
});
