import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PartyDetailsCard } from './party-details-card';

describe('PartyDetailsCard', () => {
  let fixture: ComponentFixture<PartyDetailsCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartyDetailsCard],
    }).compileComponents();

    fixture = TestBed.createComponent(PartyDetailsCard);
  });

  function values(): string[] {
    const el: HTMLElement = fixture.nativeElement;
    return [...el.querySelectorAll('dd')].map(dd => dd.textContent?.trim() ?? '');
  }

  it('shows dashes until a party is picked, and hides an empty number', async () => {
    await fixture.whenStable();
    expect(values()).toEqual(['-', '-', '-']);
  });

  it('shows the party and the formatted document number', async () => {
    fixture.componentRef.setInput('party', { registration_number: 'REG1', address: 'Kathmandu', contact: '98000' });
    fixture.componentRef.setInput('documentNumber', '|PE-000003');
    await fixture.whenStable();
    expect(values()).toEqual(['REG1', 'Kathmandu', '98000', 'PE-000003']);
  });
});
