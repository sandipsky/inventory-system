import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DRAWER_DATA, DrawerRef } from '@lumen-ui/angular';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { OperationGroup, Role, RoleFormData } from '../role.model';
import { RoleForm } from './role-form';

const API = environment.apiUrl;
const SAVED = { success: true, message: 'Saved', errorCode: 0, timestamp: 0, post_data_id: 2 };

const OPERATIONS: OperationGroup[] = [
  {
    master_module: 'Masters',
    modules: [
      {
        module_name: 'Category',
        operations: [
          { id: 1, name: 'CreateCategory', selected: false },
          { id: 2, name: 'ViewCategory', selected: false },
          { id: 3, name: 'EditCategory', selected: false },
          { id: 4, name: 'DeleteCategory', selected: false },
        ],
      },
      {
        module_name: 'Unit',
        operations: [
          { id: 5, name: 'CreateUnit', selected: false },
          { id: 6, name: 'ViewUnit', selected: false },
        ],
      },
    ],
  },
  {
    master_module: 'Sales',
    modules: [
      {
        module_name: 'SalesEntry',
        operations: [
          { id: 60, name: 'ViewSalesEntries', selected: false },
          { id: 63, name: 'CancelSalesEntry', selected: false },
        ],
      },
    ],
  },
];

const KEEPER: Role = {
  id: 2,
  name: 'Store Keeper',
  description: 'Can view products and categories',
  is_active: true,
  operation_ids: [2, 6],
  operations: [],
};

describe('RoleForm', () => {
  let http: HttpTestingController;

  async function setup(data: RoleFormData, roleId = 1) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [RoleForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DRAWER_DATA, useValue: data },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    const auth = TestBed.inject(AuthService);
    auth.user.set(testUser({ roleId, operations: ['EditRole'] }));
    http = TestBed.inject(HttpTestingController);
    const fixture: ComponentFixture<RoleForm> = TestBed.createComponent(RoleForm);
    const operations = http.expectOne(`${API}/roles/operations/0`);
    return { fixture, component: fixture.componentInstance, drawerRef, auth, operations };
  }

  afterEach(() => http.verify());

  it('adds a role with the permissions ticked in the matrix', async () => {
    const { fixture, component, drawerRef, operations } = await setup({ mode: 'add' });
    expect(component.title()).toBe('Add Role');
    expect(component.loadingGroups()).toBe(true);
    operations.flush(OPERATIONS);
    await fixture.whenStable();

    expect(component.allIds()).toEqual([1, 2, 3, 4, 5, 6, 60, 63]);
    expect(component.groups()[1].rows[0].extras).toEqual([{ id: 63, label: 'Cancel' }]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('0 of 8 selected');

    // A whole module, then a single operation.
    component.setAll(component.groups()[0].rows[0].ids, true);
    component.setAll([60], true);
    expect(component.allOf(component.groups()[0].rows[0].ids)).toBe(true);
    expect(component.countOf(component.groups()[0].ids)).toBe(4);

    component.form.patchValue({ name: ' Store Keeper ', description: '' });
    component.save();
    const req = http.expectOne({ method: 'POST', url: `${API}/roles` });
    expect(req.request.body).toEqual({
      name: 'Store Keeper',
      description: null,
      is_active: true,
      operation_ids: [1, 2, 3, 4, 60],
    });
    req.flush(SAVED);
    expect(drawerRef.close).toHaveBeenCalledWith(true);
  });

  it('needs a name', async () => {
    const { component, operations } = await setup({ mode: 'add' });
    operations.flush(OPERATIONS);
    component.save();
    http.expectNone({ method: 'POST', url: `${API}/roles` });
    expect(component.form.controls.name.touched).toBe(true);
  });

  it('opens a role read-only and switches to edit', async () => {
    const { fixture, component, operations } = await setup({ mode: 'view', id: 2 });
    http.expectOne(`${API}/roles/2`).flush(KEEPER);
    operations.flush(OPERATIONS);
    await fixture.whenStable();

    expect(component.readonly()).toBe(true);
    expect(component.title()).toBe('Role');
    expect(component.form.controls.name.value).toBe('Store Keeper');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2 of 8 granted');

    component.startEdit();
    await fixture.whenStable();
    expect(component.title()).toBe('Edit Role');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Select all');
  });

  it('keeps the role’s permissions when saved before the matrix loads', async () => {
    const { component, operations } = await setup({ mode: 'edit', id: 2 });
    // Saving waits for the role itself.
    component.save();
    http.expectNone({ method: 'PUT', url: `${API}/roles/2` });

    http.expectOne(`${API}/roles/2`).flush(KEEPER);
    expect(component.own).toBe(false);
    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/roles/2` });
    expect(req.request.body).toMatchObject({ operation_ids: [2, 6] });
    req.flush(SAVED);
    operations.flush(OPERATIONS);
  });

  it('warns on your own role and refreshes your permissions after saving it', async () => {
    const { fixture, component, auth, operations } = await setup({ mode: 'edit', id: 2 }, KEEPER.id);
    http.expectOne(`${API}/roles/2`).flush(KEEPER);
    operations.flush(OPERATIONS);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('This is your own role');

    const refresh = vi.spyOn(auth, 'refreshUser');
    component.setAll([6], false);
    component.save();
    const req = http.expectOne({ method: 'PUT', url: `${API}/roles/2` });
    expect(req.request.body).toMatchObject({ operation_ids: [2] });
    req.flush(SAVED);

    expect(refresh).toHaveBeenCalled();
    http.expectOne(`${API}/getUserRoleOperations`).flush({
      id: 1, username: 'admin', name: null, role_id: 2, role_name: 'Store Keeper', image_url: null,
      master_modules: [], modules: [], operations: ['ViewCategory'],
    });
  });

  it('stays open when the server refuses', async () => {
    const { component, drawerRef, operations } = await setup({ mode: 'edit', id: 2 });
    http.expectOne(`${API}/roles/2`).flush(KEEPER);
    operations.flush(OPERATIONS);
    component.save();
    http
      .expectOne({ method: 'PUT', url: `${API}/roles/2` })
      .flush({ message: 'Role with the same name already exists' }, { status: 409, statusText: 'Conflict' });
    expect(drawerRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBe(false);
  });
});
