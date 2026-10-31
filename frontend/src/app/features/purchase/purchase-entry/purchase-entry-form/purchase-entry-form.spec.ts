import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PurchaseEntryForm } from './purchase-entry-form';

describe('PurchaseEntryForm', () => {
  let component: PurchaseEntryForm;
  let fixture: ComponentFixture<PurchaseEntryForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseEntryForm],
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseEntryForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
