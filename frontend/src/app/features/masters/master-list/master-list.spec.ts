import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';
import { testUser } from '../../../auth/auth.testing';
import { MasterKind, MasterRecord } from '../masters.model';
import { MasterList } from './master-list';

const ROW: MasterRecord = { id: 1, name: 'VAT 13%', tax_rate: 13, is_active: true };

describe('MasterList', () => {
  let component: MasterList;
  let fixture: ComponentFixture<MasterList>;
  let http: HttpTestingController;

  async function setup(kind: MasterKind, operations: string[]) {
    await TestBed.configureTestingModule({
      imports: [MasterList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { master: kind } } } },
      ],
    }).compileComponents();

    TestBed.inject(AuthService).user.set(testUser({ operations }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MasterList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  function nextRequest(path: string): TestRequest {
    TestBed.tick();
    return http.expectOne(req => req.url === `${environment.apiUrl}/master/${path}`);
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('loads the first page of the route’s master, newest first', async () => {
    await setup('taxType', ['ViewTaxType', 'CreateTaxType', 'EditTaxType']);
    const req = nextRequest('taxtypes');
    expect(req.request.params.get('pageIndex')).toBe('0');
    expect(req.request.params.get('pageSize')).toBe('10');
    expect(req.request.params.get('sort')).toBe('id:desc');

    req.flush({ content: [ROW], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(component.rows()).toEqual([ROW]);
    expect(component.columns().map(column => column.key)).toEqual(['sn', 'name', 'tax_rate', 'is_active', 'actions']);
    expect(text()).toContain('Add Tax Type');
    expect(text()).toContain('13%');
    expect(text()).toContain('ACTIVE');
  });

  it('uses the API’s spelling of the categories path', async () => {
    await setup('category', ['ViewCategory']);
    nextRequest('categorys').flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    expect(component.columns().map(column => column.key)).toEqual(['sn', 'name', 'is_active']);
  });

  it('sorts by the backend field and filters from page one', async () => {
    await setup('taxType', ['ViewTaxType']);
    nextRequest('taxtypes').flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });

    component.pageIndex.set(2);
    component.sort.set({ key: 'tax_rate', direction: 'desc' });
    component.onFilterChange([{ field: 'isActive', value: '0', displayValue: 'Inactive' }]);

    const req = nextRequest('taxtypes');
    expect(req.request.params.get('sort')).toBe('taxRate:desc');
    expect(req.request.params.get('isActive')).toBe('0');
    expect(req.request.params.get('pageIndex')).toBe('0');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('shows Add and row actions only with the matching permissions', async () => {
    await setup('unit', ['ViewUnit']);
    nextRequest('units').flush({ content: [{ id: 1, name: 'Piece', is_active: true }], totalElements: 1, totalPages: 1, number: 0, size: 10 });
    await fixture.whenStable();

    expect(text()).not.toContain('Add Unit');
    expect(component.columns().some(column => column.key === 'actions')).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('l-table .link')).toBeNull();
  });

  it('shows the server message when loading fails', async () => {
    await setup('packing', ['ViewPacking']);
    nextRequest('packings').flush({ message: 'Operation not allowed' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    expect(component.emptyText()).toBe('Operation not allowed');
  });
});
