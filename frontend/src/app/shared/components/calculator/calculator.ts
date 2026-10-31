import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { Button, ButtonVariant, Icon, ModalRef } from '@lumen-ui/angular';

export type Operator = '+' | '-' | '*' | '/';

const OPERATOR_SYMBOLS: Record<Operator, string> = { '+': '+', '-': '-', '*': '×', '/': '÷' };

interface Key {
  label: string;
  action: () => void;
  kind: 'digit' | 'operator' | 'equals' | 'blank';
  variant: ButtonVariant;
}

const VARIANTS: Record<Key['kind'], ButtonVariant> = {
  digit: 'outlined',
  operator: 'ghost',
  equals: 'primary',
  blank: 'ghost',
};

const key = (label: string, kind: Key['kind'], action: () => void): Key => ({ label, kind, action, variant: VARIANTS[kind] });

/**
 * Small four-function calculator. Opened in a Lumen modal from the header; the
 * modal ref is optional so the component also works inline (e.g. in tests).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon],
  selector: 'app-calculator',
  styleUrl: './calculator.scss',
  templateUrl: './calculator.html',
})
export class Calculator {
  private readonly modalRef = inject(ModalRef, { optional: true });

  /** Digits typed since the last operator (empty until the user types). */
  private readonly entry = signal('');
  private readonly previous = signal<number | null>(null);
  private readonly operator = signal<Operator | null>(null);
  /** The last completed `a op b` shown as a hint above the result. */
  private readonly history = signal('');
  private readonly evaluated = signal(false);

  /** Small grey line: the pending expression, or the last evaluated one. */
  readonly expression = computed(() => {
    const previous = this.previous();
    const operator = this.operator();
    if (previous !== null && operator) return `${format(previous)}${OPERATOR_SYMBOLS[operator]}${this.entry()}`;
    return this.history();
  });

  /** Big line: whatever the user is typing, else the running value. */
  readonly display = computed(() => {
    const entry = this.entry();
    if (entry) return entry;
    const previous = this.previous();
    return previous === null ? '0' : format(previous);
  });

  readonly rows: Key[][] = [
    [
      key('CE', 'operator', () => this.clearEntry()),
      key('C', 'operator', () => this.clear()),
      key('%', 'operator', () => this.percent()),
      key('/', 'operator', () => this.setOperator('/')),
    ],
    [
      key('7', 'digit', () => this.digit('7')),
      key('8', 'digit', () => this.digit('8')),
      key('9', 'digit', () => this.digit('9')),
      key('X', 'operator', () => this.setOperator('*')),
    ],
    [
      key('4', 'digit', () => this.digit('4')),
      key('5', 'digit', () => this.digit('5')),
      key('6', 'digit', () => this.digit('6')),
      key('-', 'operator', () => this.setOperator('-')),
    ],
    [
      key('1', 'digit', () => this.digit('1')),
      key('2', 'digit', () => this.digit('2')),
      key('3', 'digit', () => this.digit('3')),
      key('+', 'operator', () => this.setOperator('+')),
    ],
    [
      key('', 'blank', () => undefined),
      key('0', 'digit', () => this.digit('0')),
      key('.', 'digit', () => this.digit('.')),
      key('=', 'equals', () => this.equals()),
    ],
  ];

  close() {
    this.modalRef?.close();
  }

  digit(char: string) {
    if (this.evaluated()) {
      // Typing after "=" starts a fresh calculation.
      this.previous.set(null);
      this.history.set('');
      this.evaluated.set(false);
    }

    const entry = this.entry();
    if (char === '.') {
      if (entry.includes('.')) return;
      this.entry.set(entry ? `${entry}.` : '0.');
      return;
    }
    this.entry.set(entry === '0' ? char : `${entry}${char}`);
  }

  setOperator(operator: Operator) {
    const entry = this.entry();
    const previous = this.previous();

    if (!entry) {
      // No new operand yet: just (re)select the operator on the running value.
      if (previous !== null) this.operator.set(operator);
      return;
    }

    const value = Number(entry);
    const result = previous !== null && this.operator() ? calculate(previous, this.operator()!, value) : value;

    this.previous.set(result);
    this.operator.set(operator);
    this.entry.set('');
    this.history.set('');
    this.evaluated.set(false);
  }

  equals() {
    const previous = this.previous();
    const operator = this.operator();
    const entry = this.entry();
    if (previous === null || !operator) return;

    const value = entry ? Number(entry) : previous;
    const result = calculate(previous, operator, value);

    this.history.set(`${format(previous)}${OPERATOR_SYMBOLS[operator]}${format(value)}`);
    this.previous.set(result);
    this.operator.set(null);
    this.entry.set('');
    this.evaluated.set(true);
  }

  percent() {
    const entry = this.entry();
    if (entry) {
      this.entry.set(format(Number(entry) / 100));
      return;
    }
    const previous = this.previous();
    if (previous !== null) this.previous.set(previous / 100);
  }

  backspace() {
    if (this.evaluated()) return;
    this.entry.update(entry => entry.slice(0, -1));
  }

  clearEntry() {
    this.entry.set('');
    if (this.evaluated()) this.clear();
  }

  clear() {
    this.entry.set('');
    this.previous.set(null);
    this.operator.set(null);
    this.history.set('');
    this.evaluated.set(false);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (/^[0-9.]$/.test(key)) this.digit(key);
    else if (key === '+' || key === '-' || key === '*' || key === '/') this.setOperator(key);
    else if (key === 'x' || key === 'X') this.setOperator('*');
    else if (key === 'Enter' || key === '=') this.equals();
    else if (key === '%') this.percent();
    else if (key === 'Backspace') this.backspace();
    else if (key === 'Delete') this.clearEntry();
    else if (key === 'Escape') this.close();
    else return;
    event.preventDefault();
  }
}

function calculate(a: number, operator: Operator, b: number): number {
  switch (operator) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return b === 0 ? NaN : a / b;
  }
}

/** Trim floating-point noise (0.1 + 0.2) without forcing fixed decimals. */
function format(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  return String(Number(value.toPrecision(12)));
}
