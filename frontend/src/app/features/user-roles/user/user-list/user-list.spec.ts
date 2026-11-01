import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DrawerService } from '@lumen-ui/angular';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/auth.service';
import { testUser } from '../../../../auth/auth.testing';
import { User } from '../user.model';
import { UserForm } from '../user-form/user-form';
import { UserList } from './user-list';

const API = environment.apiUrl;

function user(overrides: Partial<User>): User {
  return {
    id: 1,
    username: 'admin',
    full_name: 'Admin',
    email: 'admin@admin.com',
    gender: 'Other',
    contact: null,
    remarks: null,
    is_active: true,
    role_id: 1,
    role_name: 'Admin',
    image_url: null,
    ...overrides,
  };
}

const ADMIN = user({});
const SITA = user({ id: 2, username: 'sita', full_name: 'Sita Sharma', email: 'sita@example.com', role_id: 2, role_name: 'Store Keeper' });

describe('UserList', () => {
  let component: UserList;
  let fixture: ComponentFixture<UserList>;
  let http: HttpTestingController;

  async function setup(operations: string[]) {
    await TestBed.configureTestingModule({
      imports: [UserList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ id: ADMIN.id, operations }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UserList);
    component = fixture.componentInstance;
    http.expectOne(`${API}/dropdown/roles/all`).flush([{ id: 1, name: 'Admin' }, { id: 2, name: 'Store Keeper' }]);
    await fixture.whenStable();
  }

  function nextRequest(): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === `${API}/users`);
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('loads the first page, newest first, and filters by role name', async () => {
    await setup(['ViewUser', 'CreateUser', 'EditUser']);
    const req = nextRequest();
    expect(req.request.params.get('pageIndex')).toBe('0');
    expect(req.request.params.get('sort')).toBe('id:desc');
    req.flush({ content: [SITA, ADMIN], totalElements: 2, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(text()).toContain('Add User');
    expect(text()).toContain('Sita Sharma');
    expect(text()).toContain('Store Keeper');
    expect(component.filterColumns().find(column => column.formcontrolName === 'role.name')?.data).toEqual([
      { id: 'Admin', name: 'Admin' },
      { id: 'Store Keeper', name: 'Store Keeper' },
    ]);
  });

  it('sorts by the backend field and filters from page one', async () => {
    await setup(['ViewUser']);
    nextRequest().flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });

    component.pageIndex.set(1);
    component.sort.set({ key: 'role_name', direction: 'asc' });
    component.onFilterChange([{ field: 'isActive', value: '0', displayValue: 'Inactive' }]);

    const req = nextRequest();
    expect(req.request.params.get('sort')).toBe('role.name:asc');
    expect(req.request.params.get('isActive')).toBe('0');
    expect(req.request.params.get('pageIndex')).toBe('0');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('marks your own account and never offers to delete it', async () => {
    await setup(['ViewUser', 'EditUser', 'DeleteUser']);
    nextRequest().flush({ content: [SITA, ADMIN], totalElements: 2, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(component.isSelf(ADMIN)).toBe(true);
    expect([SITA, ADMIN].map(row => component.canDeleteRow(row))).toEqual([true, false]);
    expect(text()).toContain('You');
  });

  it('shows Add, Edit and Delete only with the matching permissions', async () => {
    await setup(['ViewUser']);
    nextRequest().flush({ content: [SITA], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(text()).not.toContain('Add User');
    expect(component.canEdit()).toBe(false);
    expect(component.canDeleteRow(SITA)).toBe(false);
    // The name still opens the user read-only.
    expect((fixture.nativeElement as HTMLElement).querySelector('l-table .link')?.textContent).toContain('Sita Sharma');
  });

  it('opens the form in a bottom drawer in the mode asked for', async () => {
    await setup(['ViewUser', 'EditUser']);
    nextRequest().flush({ content: [SITA], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    const open = vi.spyOn(TestBed.inject(DrawerService), 'open').mockReturnValue({ afterClosed: () => of(false) } as never);

    component.openForm('edit', SITA.id);
    expect(open).toHaveBeenCalledWith(UserForm, expect.objectContaining({
      data: { mode: 'edit', id: SITA.id },
      position: 'bottom',
      panelClass: 'drawer-sheet',
      disableClose: true,
    }));
  });
});
