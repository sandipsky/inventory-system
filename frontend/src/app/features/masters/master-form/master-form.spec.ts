import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DRAWER_DATA, DrawerRef } from '@lumen-ui/angular';
import { environment } from '../../../../environments/environment';
import { MasterFormData } from '../masters.model';
import { MasterForm } from './master-form';

const API = environment.apiUrl;
const SAVED = { success: true, message: 'Saved', errorCode: 0, timestamp: 0, post_data_id: 3 };

describe('MasterForm', () => {
  let http: HttpTestingController;

  async function setup(data: MasterFormData) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [MasterForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<MasterForm> = TestBed.createComponent(MasterForm);
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  afterEach(() => http.verify());

  it('adds a unit with a trimmed name and no tax rate', async () => {
    const { fixture, component, drawerRef } = await setup({ kind: 'unit' });
    expect(component.title).toBe('Add Unit');
    expect((fixture.nativeElement as HTMLElement).querySelector('l-number-input')).toBeNull();

    component.form.controls.name.setValue('  Dozen ');
    component.save();

    const req = http.expectOne({ method: 'POST', url: `${API}/master/units` });
    expect(req.request.body).toEqual({ name: 'Dozen', is_active: true });
    req.flush(SAVED);
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('requires a rate for tax types', async () => {
    const { component } = await setup({ kind: 'taxType' });
    component.form.controls.name.setValue('VAT 15%');
    component.save();
    http.expectNone(`${API}/master/taxtypes`);
    expect(component.form.controls.tax_rate.touched).toBe(true);

    component.form.controls.tax_rate.setValue(15);
    component.save();
    const req = http.expectOne({ method: 'POST', url: `${API}/master/taxtypes` });
    expect(req.request.body).toEqual({ name: 'VAT 15%', tax_rate: 15, is_active: true });
    req.flush(SAVED);
  });

  it('edits the record it was opened with', async () => {
    const { component } = await setup({ kind: 'category', record: { id: 3, name: 'Accessories', is_active: true } });
    expect(component.title).toBe('Edit Category');
    expect(component.form.controls.name.value).toBe('Accessories');

    component.form.controls.is_active.setValue(false);
    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/master/categorys/3` });
    expect(req.request.body).toEqual({ name: 'Accessories', is_active: false });
    req.flush(SAVED);
  });

  it('stays open when the server refuses', async () => {
    const { component, drawerRef } = await setup({ kind: 'packing' });
    component.form.controls.name.setValue('Carton');
    component.save();
    http
      .expectOne({ method: 'POST', url: `${API}/master/packings` })
      .flush({ message: 'Packing with the same name already exists' }, { status: 409, statusText: 'Conflict' });
    expect(drawerRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBe(false);
  });

  it('closes without a result on cancel', async () => {
    const { component, drawerRef } = await setup({ kind: 'unit' });
    component.close();
    expect(drawerRef.close).toHaveBeenCalledWith(false);
  });
});
