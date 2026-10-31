import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PurchaseEntryList } from './purchase-entry-list';

describe('PurchaseEntryList', () => {
  let component: PurchaseEntryList;
  let fixture: ComponentFixture<PurchaseEntryList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseEntryList],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseEntryList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
