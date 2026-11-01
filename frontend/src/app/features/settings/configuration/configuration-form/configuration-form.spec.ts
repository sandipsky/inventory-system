import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { Configuration } from '../configuration.model';
import { ConfigurationForm } from './configuration-form';

const SETTINGS: Configuration[] = [
  { id: 1, name: 'company_name', label: 'Company Name', value: 'Test Pvt. Ltd.', is_editable: true },
  { id: 6, name: 'company_email', label: 'Company Email', value: 'test@company.com', is_editable: true },
  { id: 7, name: 'calendar_type', label: 'Calendar Type', value: 'BS', is_editable: true },
  { id: 8, name: 'default_rounding', label: 'Default Rounding', value: '1', is_editable: true },
  { id: 9, name: 'fiscal_year', label: 'Fiscal Year', value: '2081', is_editable: false },
  { id: 10, name: 'invoice_footer', label: 'Invoice Footer', value: 'Thank you', is_editable: true },
];

const URL = `${environment.apiUrl}/configurations`;

describe('ConfigurationForm', () => {
  let component: ConfigurationForm;
  let fixture: ComponentFixture<ConfigurationForm>;
  let http: HttpTestingController;

  async function setup(operations: string[]) {
    await TestBed.configureTestingModule({
      imports: [ConfigurationForm],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ConfigurationForm);
    component = fixture.componentInstance;
    http.expectOne(URL).flush(SETTINGS);
    await fixture.whenStable();
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function saveRequest(): TestRequest {
    return http.expectOne(req => req.method === 'PUT' && req.url === `${URL}/edit`);
  }

  afterEach(() => http.verify());

  it('shows the settings read-only, grouped into sections', async () => {
    await setup(['ViewConfiguration', 'EditConfiguration']);

    expect(component.readonly()).toBe(true);
    expect(component.sections().map(section => section.key)).toEqual(['company', 'preferences', 'other']);
    expect(text()).toContain('Test Pvt. Ltd.');
    expect(text()).toContain('BS (Bikram Sambat)');
    expect(text()).toContain('Invoice Footer');
    expect(text()).toContain('Edit');
    expect(component.form.controls['default_rounding'].value).toBe(true);
  });

  it('hides Edit without EditConfiguration', async () => {
    await setup(['ViewConfiguration']);
    expect(text()).not.toContain('Edit');
  });

  it('saves only the editable settings that changed, toggles as 1 or 0', async () => {
    await setup(['ViewConfiguration', 'EditConfiguration']);
    component.startEdit();
    component.form.controls['company_name'].setValue('  Shakya Traders ');
    component.form.controls['default_rounding'].setValue(false);
    component.save();

    const req = saveRequest();
    expect(req.request.body).toEqual([
      { ...SETTINGS[0], value: 'Shakya Traders' },
      { ...SETTINGS[3], value: '0' },
    ]);
    req.flush({ success: true, message: 'Configurations updated successfully' });
    await fixture.whenStable();

    expect(component.editing()).toBe(false);
    expect(component.settings()[0].value).toBe('Shakya Traders');
    expect(component.form.controls['company_name'].value).toBe('Shakya Traders');
  });

  it('leaves settings the API locks out of the form value', async () => {
    await setup(['ViewConfiguration', 'EditConfiguration']);
    expect(component.form.controls['fiscal_year'].disabled).toBe(true);
  });

  it('sends nothing when no setting changed', async () => {
    await setup(['ViewConfiguration', 'EditConfiguration']);
    component.startEdit();
    component.form.controls['company_name'].setValue('Test Pvt. Ltd. ');
    component.save();

    http.expectNone(`${URL}/edit`);
    expect(component.editing()).toBe(false);
  });

  it('requires a company name', async () => {
    await setup(['ViewConfiguration', 'EditConfiguration']);
    component.startEdit();
    component.form.controls['company_name'].setValue('');
    component.save();

    http.expectNone(`${URL}/edit`);
    expect(component.editing()).toBe(true);
  });

  it('restores the saved values on cancel', async () => {
    await setup(['ViewConfiguration', 'EditConfiguration']);
    component.startEdit();
    component.form.controls['calendar_type'].setValue('AD');
    component.cancel();

    expect(component.editing()).toBe(false);
    expect(component.form.controls['calendar_type'].value).toBe('BS');
  });
});
