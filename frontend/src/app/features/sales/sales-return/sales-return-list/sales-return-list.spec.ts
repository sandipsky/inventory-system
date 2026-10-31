import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SalesReturnList } from './sales-return-list';

describe('SalesReturnList', () => {
  let component: SalesReturnList;
  let fixture: ComponentFixture<SalesReturnList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesReturnList],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesReturnList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
