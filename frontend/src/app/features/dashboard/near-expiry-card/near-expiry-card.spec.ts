import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { toIsoDate } from '../../../shared/utils/date';
import { NearExpiryBatch } from '../dashboard.model';
import { NearExpiryCard, donutSlices } from './near-expiry-card';

const CIRCUMFERENCE = 2 * Math.PI * 70;

describe('donutSlices', () => {
  it('draws a single value as the whole ring', () => {
    expect(donutSlices([5])).toEqual([{ length: CIRCUMFERENCE, start: 0 }]);
  });

  it('sizes slices by value, leaving room for the round caps and a gap after each', () => {
    const [a, b, c] = donutSlices([2, 1, 1]);

    expect(a.length).toBeCloseTo(2 * b.length);
    expect(b.start).toBeCloseTo(a.start + a.length + 17);
    expect(c.start + c.length + 17 - a.start).toBeCloseTo(CIRCUMFERENCE);
  });
});

describe('NearExpiryCard', () => {
  let fixture: ComponentFixture<NearExpiryCard>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/dashboard/near-expiry`;

  function batch(id: number, expiry_date: string, quantity = 10): NearExpiryBatch {
    return { product_id: id, product_name: `Product ${id}`, batch_id: id, batch_no: `B${id}`, expiry_date, quantity };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NearExpiryCard],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NearExpiryCard);
    TestBed.tick();
  });

  async function flush(batches: NearExpiryBatch[]) {
    const req = http.expectOne(req => req.url === url);
    req.flush(batches);
    await fixture.whenStable();
    return req;
  }

  it('names the five soonest batches and groups the rest', async () => {
    const req = await flush([
      batch(8, '2026-01-01'),
      ...[1, 2, 3, 4, 5, 6].map(id => batch(id, `2099-0${id}-01`, id)),
    ]);

    expect(req.request.params.get('months')).toBe('6');
    const slices = fixture.componentInstance.slices();
    expect(slices.map(slice => slice.name)).toEqual([
      'Product 8', 'Product 1', 'Product 2', 'Product 3', 'Product 4', '2 more batches',
    ]);
    expect(slices.at(-1)?.quantity).toBe(5 + 6);
    expect(fixture.componentInstance.center()).toEqual({ value: 7, label: 'Batches' });
    expect((fixture.nativeElement as HTMLElement).querySelector('.legend .expired')?.textContent).toContain('Expired');
  });

  it('shows the hovered slice in the middle of the ring', async () => {
    await flush([batch(1, toIsoDate(new Date()), 245)]);

    fixture.componentInstance.active.set(0);

    expect(fixture.componentInstance.center()).toEqual({ value: 245, label: 'Product 1' });
  });

  it('asks again for another period, and says so when nothing expires', async () => {
    await flush([batch(1, '2099-01-01')]);

    fixture.componentInstance.months.set(1);
    TestBed.tick();
    const req = await flush([]);

    expect(req.request.params.get('months')).toBe('1');
    expect((fixture.nativeElement as HTMLElement).querySelector('.empty')?.textContent).toContain(
      'No batches in stock expire within 1 month.',
    );
  });
});
