import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PurchaseReturnList } from './purchase-return-list';

describe('PurchaseReturnList', () => {
  let component: PurchaseReturnList;
  let fixture: ComponentFixture<PurchaseReturnList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseReturnList],
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseReturnList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
