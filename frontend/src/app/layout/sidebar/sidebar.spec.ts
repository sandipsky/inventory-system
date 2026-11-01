import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { testUser } from '../../auth/auth.testing';
import { Sidebar } from './sidebar';
import { SIDEBAR_SECTIONS } from './sidebar.data';

/** Every operation the menu refers to, i.e. what the admin role has. */
const ALL_OPERATIONS = SIDEBAR_SECTIONS.flatMap(section =>
  section.items.flatMap(item => [item.operation, ...(item.children ?? []).map(child => child.operation)]),
).filter((operation): operation is string => !!operation);

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    auth.user.set(testUser({ operations: ALL_OPERATIONS }));
    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter sections by item and child labels', () => {
    component.search.set('return');
    const sections = component.filteredSections();
    const labels = sections.flatMap(s => s.items.map(i => i.label));
    expect(labels).toEqual(['Purchase', 'Sales']);
    const purchase = sections[0].items[0];
    expect(purchase.children?.map(c => c.label)).toEqual(['Purchase Return']);
  });

  it('should show every section when the search is empty', () => {
    component.search.set('   ');
    expect(component.filteredSections()).toBe(component.sections());
    expect(component.searching()).toBe(false);
  });

  it('should only show links the role allows', () => {
    auth.user.set(testUser({ operations: ['ViewPurchaseEntry', 'ViewProduct'] }));
    const items = component.sections().flatMap(section => section.items);

    // Links without an operation stay; a group keeps only its permitted children.
    expect(items.map(item => item.label)).toEqual(['Dashboard', 'Purchase', 'Products', 'Reports']);
    expect(items[1].children?.map(child => child.label)).toEqual(['Purchase Entry']);
  });

  it('should hide every protected link while no user is loaded', () => {
    auth.user.set(null);
    const labels = component.sections().flatMap(section => section.items.map(item => item.label));
    expect(labels).toEqual(['Dashboard', 'Reports']);
  });

  it('should clear the search', () => {
    component.search.set('units');
    component.clearSearch();
    expect(component.search()).toBe('');
  });

  it('should toggle collapsed state', () => {
    expect(component.collapsed()).toBe(false);
    component.toggleCollapsed();
    expect(component.collapsed()).toBe(true);
  });
});
