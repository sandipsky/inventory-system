import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DRAWER_DATA, DrawerRef } from '@lumen-ui/angular';
import { PurchaseFormData } from '../../purchase.model';
import { PurchaseEntryForm } from './purchase-entry-form';

describe('PurchaseEntryForm', () => {
  async function setup(data?: PurchaseFormData) {
    const drawerRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PurchaseEntryForm],
      providers: [
        { provide: DRAWER_DATA, useValue: data ?? null },
        { provide: DrawerRef, useValue: drawerRef },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<PurchaseEntryForm> = TestBed.createComponent(PurchaseEntryForm);
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance, drawerRef };
  }

  it('defaults to add mode without drawer data', async () => {
    const { component } = await setup();
    expect(component.mode()).toBe('add');
    expect(component.title()).toBe('Add Purchase Entry');
    expect(component.readonly()).toBe(false);
  });

  it('opens read-only in view mode and switches to edit', async () => {
    const { component } = await setup({ mode: 'view', id: 7 });
    expect(component.readonly()).toBe(true);
    expect(component.id()).toBe(7);

    component.startEdit();
    expect(component.mode()).toBe('edit');
    expect(component.title()).toBe('Edit Purchase Entry');
  });

  it('closes the drawer with the result', async () => {
    const { component, drawerRef } = await setup({ mode: 'edit', id: 3 });
    component.save();
    expect(drawerRef.close).toHaveBeenCalledWith(true);
    component.close();
    expect(drawerRef.close).toHaveBeenCalledWith(false);
  });
});
