import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DrawerService, ModalService, NotificationService } from '@lumen-ui/angular';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { Role } from '../role.model';
import { RoleForm } from '../role-form/role-form';
import { RoleList } from './role-list';

const API = environment.apiUrl;

const ADMIN: Role = {
  id: 1,
  name: 'Admin',
  description: 'Administrator with full access to all operations',
  is_active: true,
  operation_ids: [1, 2, 3],
  operations: [],
};
const KEEPER: Role = { id: 2, name: 'Keeper', description: null, is_active: true, operation_ids: [2], operations: [] };

describe('RoleList', () => {
  let component: RoleList;
  let fixture: ComponentFixture<RoleList>;
  let http: HttpTestingController;

  async function setup(operations: string[]) {
    await TestBed.configureTestingModule({
      imports: [RoleList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ roleId: ADMIN.id, operations }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RoleList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === `${API}/roles`);
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('lists roles with their permission count and marks your own', async () => {
    await setup(['ViewRole', 'CreateRole', 'EditRole']);
    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('id:desc');
    req.flush({ content: [KEEPER, ADMIN], totalElements: 2, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(text()).toContain('Add Role');
    expect(text()).toContain('1 permission');
    expect(text()).toContain('3 permissions');
    expect(text()).toContain('Your role');
    expect(component.isOwn(ADMIN)).toBe(true);
  });

  it('refuses to delete a role users still have', async () => {
    await setup(['ViewRole', 'DeleteRole']);
    nextRequest().flush({ content: [KEEPER], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    const warn = vi.spyOn(TestBed.inject(NotificationService), 'warn');
    const open = vi.spyOn(TestBed.inject(ModalService), 'open');

    component.remove(KEEPER);
    const req = http.expectOne(r => r.url === `${API}/users`);
    expect(req.request.params.get('role.name')).toBe('Keeper');
    // "Keeper" also matches "Store Keeper" users, who don't count.
    req.flush({
      content: [{ id: 5, role_id: 2 }, { id: 6, role_id: 9 }],
      totalElements: 2, totalPages: 1, number: 0, size: 1000,
    });

    expect(warn).toHaveBeenCalledWith('Role in use', '1 user has the "Keeper" role. Give them another role first.');
    expect(open).not.toHaveBeenCalled();
  });

  it('asks before deleting a role nobody has', async () => {
    await setup(['ViewRole', 'DeleteRole']);
    nextRequest().flush({ content: [KEEPER], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    const open = vi.spyOn(TestBed.inject(ModalService), 'open');

    component.remove(KEEPER);
    http
      .expectOne(r => r.url === `${API}/users`)
      .flush({ content: [{ id: 6, role_id: 9 }], totalElements: 1, totalPages: 1, number: 0, size: 1000 });

    expect(open).toHaveBeenCalled();
  });

  it('sorts by the backend field', async () => {
    await setup(['ViewRole']);
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });

    component.sort.set({ key: 'is_active', direction: 'desc' });
    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('isActive:desc');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('shows Add, Edit and Delete only with the matching permissions', async () => {
    await setup(['ViewRole']);
    nextRequest().flush({ content: [KEEPER], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(text()).not.toContain('Add Role');
    expect(component.canEdit()).toBe(false);
    expect(component.canDelete()).toBe(false);
    // The name still opens the role read-only.
    expect((fixture.nativeElement as HTMLElement).querySelector('l-table .link')?.textContent).toContain('Keeper');
  });

  it('opens the form in a bottom drawer in the mode asked for', async () => {
    await setup(['ViewRole']);
    nextRequest().flush({ content: [KEEPER], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    const open = vi.spyOn(TestBed.inject(DrawerService), 'open').mockReturnValue({ afterClosed: () => of(false) } as never);

    component.openForm('view', KEEPER.id);
    expect(open).toHaveBeenCalledWith(RoleForm, expect.objectContaining({
      data: { mode: 'view', id: KEEPER.id },
      position: 'bottom',
      panelClass: 'drawer-sheet',
      disableClose: true,
    }));
  });
});
