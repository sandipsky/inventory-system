import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SalesReturnForm } from './sales-return-form';

describe('SalesReturnForm', () => {
  let component: SalesReturnForm;
  let fixture: ComponentFixture<SalesReturnForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesReturnForm],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesReturnForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
