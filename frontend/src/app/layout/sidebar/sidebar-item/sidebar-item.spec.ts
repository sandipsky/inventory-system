import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SidebarItem } from './sidebar-item';
import { SidebarItem as SidebarItemModel } from '../sidebar.model';

const groupItem: SidebarItemModel = {
  label: 'Purchase',
  icon: 'bag',
  route: '/purchase',
  children: [
    { label: 'Purchase Entry', route: '/purchase/entry' },
    { label: 'Purchase Return', route: '/purchase/return' },
  ],
};

describe('SidebarItem', () => {
  let component: SidebarItem;
  let fixture: ComponentFixture<SidebarItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarItem],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarItem);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('item', groupItem);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expand and collapse a group on toggle', () => {
    expect(component.expanded()).toBe(false);
    component.toggle();
    expect(component.expanded()).toBe(true);
    component.toggle();
    expect(component.expanded()).toBe(false);
  });

  it('should expand while the sidebar is collapsed', () => {
    fixture.componentRef.setInput('collapsed', true);
    component.toggle();
    expect(component.expanded()).toBe(true);
  });
});
