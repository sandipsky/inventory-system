import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SalesEntryList } from './sales-entry-list';

describe('SalesEntryList', () => {
  let component: SalesEntryList;
  let fixture: ComponentFixture<SalesEntryList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesEntryList],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesEntryList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
