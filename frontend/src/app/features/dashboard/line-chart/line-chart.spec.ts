import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LineChart, niceStep, smoothPath } from './line-chart';

describe('niceStep', () => {
  it('rounds to 1, 2, 2.5 or 5 × 10ⁿ', () => {
    expect(niceStep(187693, 5)).toBe(50000);
    expect(niceStep(400000, 5)).toBe(100000);
    expect(niceStep(12, 5)).toBe(2.5);
  });

  it('gives an empty chart a scale anyway', () => {
    expect(niceStep(0, 5)).toBe(1000);
  });
});

describe('smoothPath', () => {
  it('joins two points with a straight line', () => {
    expect(smoothPath([{ x: 0, y: 10 }, { x: 10, y: 0 }])).toBe('M0,10L10,0');
  });

  it('never bends past the points it passes through', () => {
    const path = smoothPath([
      { x: 0, y: 100 },
      { x: 10, y: 0 },
      { x: 20, y: 100 },
      { x: 30, y: 100 },
      { x: 40, y: 60 },
    ]);
    const ys = path.match(/-?[\d.]+/g)!.map(Number).filter((_, i) => i % 2 === 1);

    expect(path.startsWith('M0,100C')).toBe(true);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
  });
});

describe('LineChart', () => {
  let fixture: ComponentFixture<LineChart>;
  let chart: LineChart;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LineChart] }).compileComponents();

    fixture = TestBed.createComponent(LineChart);
    fixture.componentRef.setInput('labels', ['Sep', 'Oct', 'Nov']);
    fixture.componentRef.setInput('titles', ['September 2026', 'October 2026', 'November 2026']);
    fixture.componentRef.setInput('series', [
      { name: 'Purchase', color: 'blue', values: [100, 0, 300] },
      { name: 'Sales', color: 'green', values: [50, 80, 0] },
    ]);
    chart = fixture.componentInstance;
    element = fixture.nativeElement;
    // jsdom lays nothing out, so the size the ResizeObserver would report is set by hand.
    chart.width.set(400);
    chart.height.set(240);
    await fixture.whenStable();
  });

  it('draws a line per series over a scale from zero', () => {
    expect(element.querySelectorAll('path.line')).toHaveLength(2);
    expect([...element.querySelectorAll('.tick')].map(tick => tick.textContent?.trim())).toEqual(['0', '100', '200', '300']);
    expect(element.querySelector('.empty')).toBeNull();
  });

  it('shows every series at the focused label; arrow keys move it', async () => {
    chart.onFocus();
    expect(chart.hover()?.title).toBe('November 2026');

    chart.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await fixture.whenStable();

    const tooltip = element.querySelector('.tooltip')!;
    expect(tooltip.querySelector('.title')?.textContent).toBe('October 2026');
    expect([...tooltip.querySelectorAll('.value')].map(value => value.textContent)).toEqual(['0.00', '80.00']);
    expect(element.querySelectorAll('circle.dot')).toHaveLength(2);
  });

  it('lists the values in a table for screen readers', () => {
    const rows = [...element.querySelectorAll('table tbody tr')].map(row =>
      [...row.children].map(cell => cell.textContent?.trim()),
    );

    expect(rows[0]).toEqual(['September 2026', '100.00', '50.00']);
    expect(rows).toHaveLength(3);
  });

  it('says so when every value is zero', async () => {
    fixture.componentRef.setInput('series', [{ name: 'Sales', color: 'green', values: [0, 0, 0] }]);
    await fixture.whenStable();

    expect(element.querySelector('.empty')?.textContent).toBe('Nothing to show for this period.');
  });
});
