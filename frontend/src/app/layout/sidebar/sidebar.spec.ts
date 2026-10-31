import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([])],
    }).compileComponents();

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
    expect(component.filteredSections()).toBe(component.sections);
    expect(component.searching()).toBe(false);
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
