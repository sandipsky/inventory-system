import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PartyDetailsCard } from './party-details-card';

describe('PartyDetailsCard', () => {
  let component: PartyDetailsCard;
  let fixture: ComponentFixture<PartyDetailsCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartyDetailsCard],
    }).compileComponents();

    fixture = TestBed.createComponent(PartyDetailsCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
