import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Calculator } from './calculator';

describe('Calculator', () => {
  let component: Calculator;
  let fixture: ComponentFixture<Calculator>;

  const press = (...keys: string[]) => {
    for (const key of keys) component.onKeydown(new KeyboardEvent('keydown', { key }));
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Calculator] }).compileComponents();
    fixture = TestBed.createComponent(Calculator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.display()).toBe('0');
  });

  it('should add and show the evaluated expression', () => {
    press('2', '3', '+', '2', '2', 'Enter');
    expect(component.display()).toBe('45');
    expect(component.expression()).toBe('23+22');
  });

  it('should chain operators left to right', () => {
    press('2', '*', '3', '-', '1', '=');
    expect(component.display()).toBe('5');
  });

  it('should show the pending expression while typing', () => {
    press('1', '0', '/', '4');
    expect(component.expression()).toBe('10÷4');
    expect(component.display()).toBe('4');
  });

  it('should handle decimals and floating point noise', () => {
    press('0', '.', '1', '+', '0', '.', '2', '=');
    expect(component.display()).toBe('0.3');
  });

  it('should start fresh when a digit follows equals', () => {
    press('1', '+', '1', '=', '7');
    expect(component.display()).toBe('7');
    expect(component.expression()).toBe('');
  });

  it('should apply percent to the current entry', () => {
    press('5', '0', '%');
    expect(component.display()).toBe('0.5');
  });

  it('should clear the entry and everything', () => {
    press('9', '+', '8');
    component.clearEntry();
    expect(component.display()).toBe('9');
    component.clear();
    expect(component.display()).toBe('0');
    expect(component.expression()).toBe('');
  });

  it('should report division by zero as an error', () => {
    press('1', '/', '0', '=');
    expect(component.display()).toBe('Error');
  });
});
