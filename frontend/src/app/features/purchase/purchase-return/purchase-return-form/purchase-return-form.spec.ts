import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PurchaseReturnForm } from './purchase-return-form';

describe('PurchaseReturnForm', () => {
  let component: PurchaseReturnForm;
  let fixture: ComponentFixture<PurchaseReturnForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseReturnForm],
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseReturnForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
