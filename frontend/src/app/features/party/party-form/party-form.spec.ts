import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DRAWER_DATA, DrawerRef } from '@lumen-ui/angular';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';
import { testUser } from '../../../auth/auth.testing';
import { Party, PartyFormData } from '../party.model';
import { PartyForm } from './party-form';

const API = environment.apiUrl;
const SAVED = { success: true, message: 'Saved', errorCode: 0, timestamp: 0, post_data_id: 3 };

const VALLEY: Party = {
  id: 4,
  name: 'Valley Mobiles',
  registration_number: 'REG9',
  contact: null,
  address: 'Bhaktapur',
  email: null,
  remarks: null,
  is_active: true,
};

describe('PartyForm', () => {
  let http: HttpTestingController;

  async function setup(data: PartyFormData, operations: string[] = []) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PartyForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations }));
    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<PartyForm> = TestBed.createComponent(PartyForm);
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  afterEach(() => http.verify());

  it('adds a vendor with trimmed fields, sending blanks as empty text', async () => {
    const { component, drawerRef } = await setup({ kind: 'vendor', mode: 'add' });
    expect(component.title()).toBe('Add Vendor');

    component.form.patchValue({ name: '  ABC Suppliers ', contact: ' 9800000001 ' });
    component.save();

    const req = http.expectOne({ method: 'POST', url: `${API}/vendor` });
    expect(req.request.body).toEqual({
      name: 'ABC Suppliers',
      registration_number: '',
      contact: '9800000001',
      email: '',
      address: '',
      remarks: '',
      is_active: true,
    });
    req.flush(SAVED);
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('opens a customer read-only and switches to edit', async () => {
    const { fixture, component } = await setup({ kind: 'customer', mode: 'view', id: 4 }, ['EditCustomer']);
    expect(component.loading()).toBe(true);
    http.expectOne(`${API}/customer/4`).flush(VALLEY);
    await fixture.whenStable();

    expect(component.readonly()).toBe(true);
    expect(component.title()).toBe('Customer');
    expect(component.form.controls.name.value).toBe('Valley Mobiles');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Edit');

    component.startEdit();
    expect(component.mode()).toBe('edit');
    expect(component.title()).toBe('Edit Customer');
  });

  it('edits the customer it loaded, turning missing fields into empty text', async () => {
    const { component } = await setup({ kind: 'customer', mode: 'edit', id: 4 });
    http.expectOne(`${API}/customer/4`).flush(VALLEY);

    component.form.controls.is_active.setValue(false);
    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/customer/4` });
    expect(req.request.body).toEqual({
      name: 'Valley Mobiles',
      registration_number: 'REG9',
      contact: '',
      email: '',
      address: 'Bhaktapur',
      remarks: '',
      is_active: false,
    });
    req.flush(SAVED);
  });

  it('closes when the party cannot be loaded', async () => {
    const { drawerRef } = await setup({ kind: 'vendor', mode: 'edit', id: 99 });
    http.expectOne(`${API}/vendor/99`).flush({ message: 'Vendor not found' }, { status: 404, statusText: 'Not Found' });
    expect(drawerRef.close).toHaveBeenCalledWith(false);
  });

  it('requires a name and a valid email', async () => {
    const { component } = await setup({ kind: 'vendor', mode: 'add' });
    component.save();
    expect(component.form.controls.name.touched).toBe(true);

    component.form.patchValue({ name: 'ABC', email: 'not-an-email' });
    component.save();
    http.expectNone(`${API}/vendor`);

    component.form.controls.email.setValue('abc@suppliers.com');
    component.save();
    http.expectOne({ method: 'POST', url: `${API}/vendor` }).flush(SAVED);
  });

  it('stays open when the server refuses', async () => {
    const { component, drawerRef } = await setup({ kind: 'vendor', mode: 'add' });
    component.form.controls.name.setValue('ABC');
    component.save();
    http
      .expectOne({ method: 'POST', url: `${API}/vendor` })
      .flush({ message: 'Vendor name cannot be null or blank' }, { status: 400, statusText: 'Bad Request' });
    expect(drawerRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBe(false);
  });

  it('closes without a result on cancel', async () => {
    const { component, drawerRef } = await setup({ kind: 'customer', mode: 'add' });
    component.close();
    expect(drawerRef.close).toHaveBeenCalledWith(false);
  });
});
