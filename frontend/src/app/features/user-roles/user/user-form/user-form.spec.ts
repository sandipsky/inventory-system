import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DRAWER_DATA, DrawerRef, UploadFile } from '@lumen-ui/angular';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { User, UserFormData } from '../user.model';
import { UserForm } from './user-form';

const API = environment.apiUrl;
const SAVED = { success: true, message: 'Saved', errorCode: 0, timestamp: 0, post_data_id: 2 };

const SITA: User = {
  id: 2,
  username: 'sita',
  full_name: 'Sita Sharma',
  email: 'sita@example.com',
  gender: 'Female',
  contact: '9800000003',
  remarks: null,
  is_active: true,
  role_id: 3,
  role_name: 'Old Role',
  image_url: null,
};

describe('UserForm', () => {
  let http: HttpTestingController;

  async function setup(data: UserFormData, signedInId = 1) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [UserForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    const auth = TestBed.inject(AuthService);
    auth.user.set(testUser({ id: signedInId, operations: ['EditUser'] }));
    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<UserForm> = TestBed.createComponent(UserForm);
    http.expectOne(`${API}/dropdown/roles/active`).flush([{ id: 1, name: 'Admin' }, { id: 2, name: 'Store Keeper' }]);
    if (data.id) http.expectOne(`${API}/users/${data.id}`).flush(SITA);
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance, drawerRef, auth };
  }

  /** The JSON `user` part of a multipart save. */
  async function userPart(req: TestRequest): Promise<unknown> {
    return JSON.parse(await ((req.request.body as FormData).get('user') as Blob).text());
  }

  afterEach(() => http.verify());

  it('adds a user with a picture as one multipart request', async () => {
    const { component, drawerRef } = await setup({ mode: 'add' });
    expect(component.title()).toBe('Add User');
    component.form.patchValue({
      full_name: ' Sita Sharma ',
      username: 'sita',
      email: 'sita@example.com',
      password: 'Sita@1234',
      gender: 'Female',
      role_id: 2,
    });
    const photo = new File(['png'], 'photo.png', { type: 'image/png' });
    component.picture.set([{ id: '1', file: photo, name: 'photo.png', size: 3, type: 'image/png', status: 'pending', progress: 0 } as UploadFile]);
    component.save();

    const req = http.expectOne({ method: 'POST', url: `${API}/users` });
    expect(await userPart(req)).toEqual({
      username: 'sita',
      full_name: 'Sita Sharma',
      email: 'sita@example.com',
      password: 'Sita@1234',
      gender: 'Female',
      contact: null,
      remarks: null,
      is_active: true,
      role_id: 2,
    });
    expect((req.request.body as FormData).get('image')).toBe(photo);
    req.flush(SAVED);
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('needs a strong password to add a user', async () => {
    const { component } = await setup({ mode: 'add' });
    component.form.patchValue({ full_name: 'Sita', username: 'sita', email: 'sita@example.com', role_id: 2 });

    component.form.controls.password.setValue('');
    expect(component.form.controls.password.hasError('required')).toBe(true);
    component.form.controls.password.setValue('sita1234');
    expect(component.form.controls.password.hasError('pattern')).toBe(true);
    component.save();
    http.expectNone({ method: 'POST', url: `${API}/users` });

    component.form.controls.password.setValue('Sita@1234');
    expect(component.form.valid).toBe(true);
  });

  it('opens a user read-only, without the password, and switches to edit', async () => {
    const { fixture, component } = await setup({ mode: 'view', id: 2 });
    const el = fixture.nativeElement as HTMLElement;
    expect(component.readonly()).toBe(true);
    expect(component.title()).toBe('User');
    expect(component.form.controls.full_name.value).toBe('Sita Sharma');
    expect(el.querySelector('l-password-input')).toBeNull();
    expect(el.querySelector('l-file-upload')).toBeNull();

    component.startEdit();
    await fixture.whenStable();
    expect(component.title()).toBe('Edit User');
    expect(el.querySelector('l-password-input')).not.toBeNull();
  });

  it('keeps the password and picture when they are left blank on edit', async () => {
    const { component } = await setup({ mode: 'edit', id: 2 });
    // The saved role is no longer active, but still shows its name.
    expect(component.roleOptions()).toContainEqual({ id: 3, name: 'Old Role' });

    component.form.controls.contact.setValue('');
    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/users/2` });
    expect(await userPart(req)).toMatchObject({ password: '', role_id: 3, contact: null });
    expect((req.request.body as FormData).has('image')).toBe(false);
    req.flush(SAVED);
  });

  it('locks the role and status of your own account and refreshes you after saving', async () => {
    const { fixture, component, auth } = await setup({ mode: 'edit', id: SITA.id }, SITA.id);
    expect(component.self).toBe(true);
    expect(component.form.controls.role_id.disabled).toBe(true);
    expect(component.form.controls.is_active.disabled).toBe(true);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('This is your own account');

    const refresh = vi.spyOn(auth, 'refreshUser');
    component.form.controls.full_name.setValue('Sita S.');
    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/users/2` });
    expect(await userPart(req)).toMatchObject({ role_id: 3, is_active: true });
    req.flush(SAVED);

    expect(refresh).toHaveBeenCalled();
    http.expectOne(`${API}/getUserRoleOperations`).flush({
      id: 2, username: 'sita', name: 'Sita S.', role_id: 3, role_name: 'Old Role', image_url: null,
      master_modules: [], modules: [], operations: [],
    });
  });

  it('logs you out after you change your own username', async () => {
    const { component, auth } = await setup({ mode: 'edit', id: SITA.id }, SITA.id);
    const logout = vi.spyOn(auth, 'logout').mockResolvedValue(true);

    component.form.controls.username.setValue('sita.sharma');
    component.save();
    http.expectOne({ method: 'PUT', url: `${API}/users/2` }).flush(SAVED);
    expect(logout).toHaveBeenCalled();
  });

  it('stays open when the server refuses', async () => {
    const { component, drawerRef } = await setup({ mode: 'edit', id: 2 });
    component.save();
    http
      .expectOne({ method: 'PUT', url: `${API}/users/2` })
      .flush({ message: 'Email already exists' }, { status: 409, statusText: 'Conflict' });
    expect(drawerRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBe(false);
  });
});
