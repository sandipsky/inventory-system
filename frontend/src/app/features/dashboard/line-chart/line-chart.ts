import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { AmountPipe } from '../../../shared/pipes/amount.pipe';

/** One line of the chart. */
export interface ChartSeries {
  name: string;
  /** Any CSS color, e.g. `var(--chart-1)`. */
  color: string;
  /** One value per label. */
  values: readonly number[];
}

interface Point {
  x: number;
  y: number;
}

const MARGIN = { top: 12, right: 16, bottom: 32, left: 48 };
const TICK_COUNT = 5;
/** The room an x label needs; past that, labels are thinned out from the latest one back. */
const LABEL_WIDTH = 44;

const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

/** A round tick step (1, 2, 2.5 or 5 × 10ⁿ) splitting `max` into at most `count` parts. */
export function niceStep(max: number, count: number): number {
  // An empty chart still gets a money-like scale.
  if (max <= 0) return 1000;
  const raw = max / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].find(factor => factor * power >= raw)! * power;
}

/**
 * SVG path through evenly spaced points, smoothed without overshooting them (monotone cubic,
 * as d3's `curveMonotoneX`), so a curve never dips below zero between two points.
 */
export function smoothPath(points: readonly Point[]): string {
  if (points.length < 3) return points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join('');

  const last = points.length - 1;
  const secants = points.slice(1).map((p, i) => (p.y - points[i].y) / (p.x - points[i].x));
  const tangents = points.map((_, i) => {
    if (i === 0 || i === last) return 0;
    const [s0, s1] = [secants[i - 1], secants[i]];
    return s0 * s1 <= 0 ? 0 : Math.sign(s0) * Math.min(2 * Math.abs(s0), 2 * Math.abs(s1), Math.abs(s0 + s1) / 2);
  });
  tangents[0] = (3 * secants[0] - tangents[1]) / 2;
  tangents[last] = (3 * secants[last - 1] - tangents[last - 1]) / 2;

  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < last; i++) {
    const [a, b] = [points[i], points[i + 1]];
    const third = (b.x - a.x) / 3;
    path += `C${a.x + third},${a.y + third * tangents[i]} ${b.x - third},${b.y - third * tangents[i + 1]} ${b.x},${b.y}`;
  }
  return path;
}

/**
 * Lines over a shared x axis of labels, sized to fill its host (give the host a height). Hovering
 * or focusing it shows a crosshair and every series' value at that point; arrow keys move it.
 * A visually hidden table carries the same values for screen readers.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AmountPipe],
  selector: 'app-line-chart',
  styleUrl: './line-chart.scss',
  templateUrl: './line-chart.html',
})
export class LineChart {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly labels = input.required<readonly string[]>();
  /** Tooltip heading of each label, e.g. `March 2026` for `Mar`. */
  readonly titles = input.required<readonly string[]>();
  readonly series = input.required<readonly ChartSeries[]>();
  /** What the chart shows, for screen readers. */
  readonly label = input('Chart');
  /** Shown over the chart when every value is zero. */
  readonly emptyText = input('Nothing to show for this period.');

  readonly margin = MARGIN;
  readonly width = signal(0);
  readonly height = signal(0);
  /** Index of the label under the pointer or keyboard focus. */
  readonly active = signal<number | null>(null);

  readonly plotRight = computed(() => this.width() - MARGIN.right);
  readonly plotBottom = computed(() => this.height() - MARGIN.bottom);

  private readonly yTicks = computed(() => {
    const max = Math.max(0, ...this.series().flatMap(series => series.values));
    const step = niceStep(max, TICK_COUNT);
    const count = Math.max(1, Math.ceil(max / step));
    return Array.from({ length: count + 1 }, (_, i) => i * step);
  });

  private readonly xs = computed(() => {
    const count = this.labels().length;
    const span = this.plotRight() - MARGIN.left;
    return this.labels().map((_, i) => (count === 1 ? MARGIN.left + span / 2 : MARGIN.left + (i * span) / (count - 1)));
  });

  private readonly y = computed(() => {
    const max = this.yTicks().at(-1)!;
    const bottom = this.plotBottom();
    const span = bottom - MARGIN.top;
    return (value: number) => bottom - (value / max) * span;
  });

  readonly ticks = computed(() => {
    const y = this.y();
    return this.yTicks().map(value => ({ value, y: y(value), label: compact.format(value) }));
  });

  /** X labels that fit, counted back from the latest so it always shows. */
  readonly axisLabels = computed(() => {
    const xs = this.xs();
    const count = xs.length;
    const fit = Math.max(1, Math.floor((this.plotRight() - MARGIN.left) / LABEL_WIDTH));
    const every = Math.ceil(count / fit);
    return this.labels().map((text, i) => ({ text, x: xs[i], shown: (count - 1 - i) % every === 0 }));
  });

  readonly lines = computed(() => {
    const xs = this.xs();
    const y = this.y();
    return this.series().map(series => ({
      name: series.name,
      color: series.color,
      path: smoothPath(series.values.map((value, i) => ({ x: xs[i], y: y(value) }))),
    }));
  });

  readonly hover = computed(() => {
    const index = this.active();
    if (index === null || index >= this.labels().length) return null;
    const x = this.xs()[index];
    const y = this.y();
    return {
      index,
      x,
      label: this.labels()[index],
      title: this.titles()[index],
      // Past the middle, the tooltip opens to the left of the crosshair.
      flip: x > this.width() * 0.6,
      points: this.series().map(series => ({
        name: series.name,
        color: series.color,
        value: series.values[index],
        y: y(series.values[index]),
      })),
    };
  });

  readonly empty = computed(() => this.series().every(series => series.values.every(value => !value)));

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => {
        this.width.set(entry.contentRect.width);
        this.height.set(entry.contentRect.height);
      });
      observer.observe(this.host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Snaps the crosshair to the label nearest the pointer. */
  onPointerMove(event: PointerEvent) {
    const x = event.clientX - this.host.nativeElement.getBoundingClientRect().left;
    const xs = this.xs();
    if (!xs.length) return;
    let nearest = 0;
    xs.forEach((value, i) => {
      if (Math.abs(value - x) < Math.abs(xs[nearest] - x)) nearest = i;
    });
    this.active.set(nearest);
  }

  onFocus() {
    this.active.update(index => index ?? this.labels().length - 1);
  }

  onKeydown(event: KeyboardEvent) {
    const last = this.labels().length - 1;
    const current = this.active() ?? last;
    const next: Record<string, number> = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: last };
    if (!(event.key in next)) return;
    event.preventDefault();
    this.active.set(Math.min(Math.max(next[event.key], 0), last));
  }
}
