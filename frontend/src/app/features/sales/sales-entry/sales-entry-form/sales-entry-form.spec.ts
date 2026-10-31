import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SalesEntryForm } from './sales-entry-form';

describe('SalesEntryForm', () => {
  let component: SalesEntryForm;
  let fixture: ComponentFixture<SalesEntryForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesEntryForm],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesEntryForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
