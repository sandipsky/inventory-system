import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';
import { testUser } from '../../../auth/auth.testing';
import { Party, PartyKind } from '../party.model';
import { PartyList } from './party-list';

const ROW: Party = {
  id: 1,
  name: 'Tech Distributors Inc.',
  registration_number: 'REG12345',
  contact: '9876543210',
  address: 'Kathmandu, Nepal',
  email: null,
  remarks: 'Bulk electronics supplier',
  is_active: true,
};

describe('PartyList', () => {
  let component: PartyList;
  let fixture: ComponentFixture<PartyList>;
  let http: HttpTestingController;

  async function setup(kind: PartyKind, operations: string[]) {
    await TestBed.configureTestingModule({
      imports: [PartyList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { party: kind } } } },
      ],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PartyList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  function nextRequest(path: string): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === `${environment.apiUrl}/${path}`);
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('loads the first page of the route’s party, newest first', async () => {
    await setup('vendor', ['ViewVendor', 'CreateVendor', 'EditVendor']);
    const req = nextRequest('vendor');
    expect(req.request.params.get('pageIndex')).toBe('0');
    expect(req.request.params.get('pageSize')).toBe('10');
    expect(req.request.params.get('sort')).toBe('id:desc');

    req.flush({ content: [ROW], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(component.rows()).toEqual([ROW]);
    expect(component.columns().map(column => column.key)).toEqual([
      'sn', 'name', 'registration_number', 'contact', 'email', 'address', 'is_active', 'actions',
    ]);
    expect(text()).toContain('Add Vendor');
    expect(text()).toContain('REG12345');
    expect(text()).toContain('ACTIVE');
  });

  it('lists customers from their own path', async () => {
    await setup('customer', ['ViewCustomer', 'CreateCustomer']);
    nextRequest('customer').flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    await fixture.whenStable();
    expect(text()).toContain('Add Customer');
    expect(component.emptyText()).toBe('No customers found for these filters.');
  });

  it('sorts by the backend field and filters from page one', async () => {
    await setup('vendor', ['ViewVendor']);
    nextRequest('vendor').flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });

    component.pageIndex.set(2);
    component.sort.set({ key: 'registration_number', direction: 'asc' });
    component.onFilterChange([{ field: 'address', value: 'pokhara', displayValue: 'pokhara' }]);

    const req = nextRequest('vendor');
    expect(req.request.params.get('sort')).toBe('registrationNumber:asc');
    expect(req.request.params.get('address')).toBe('pokhara');
    expect(req.request.params.get('pageIndex')).toBe('0');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('shows Add and row actions only with the matching permissions', async () => {
    await setup('customer', ['ViewCustomer']);
    nextRequest('customer').flush({ content: [ROW], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(text()).not.toContain('Add Customer');
    expect(component.columns().some(column => column.key === 'actions')).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('l-table .link')).toBeNull();
  });

  it('shows the server message when loading fails', async () => {
    await setup('vendor', ['ViewVendor']);
    nextRequest('vendor').flush({ message: 'Operation not allowed' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    expect(component.emptyText()).toBe('Operation not allowed');
  });
});
