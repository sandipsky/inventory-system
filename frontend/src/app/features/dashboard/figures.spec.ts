import { lastMonths, percentChange, pointLabels } from './figures';

/** Monday. */
const TODAY = new Date(2026, 10, 2);

describe('pointLabels', () => {
  const point = (from_date: string, to_date: string) => ({ from_date, to_date, purchase: 0, sales: 0 });

  it('names a month by its three letters', () => {
    expect(pointLabels('monthly', point('2026-09-01', '2026-09-30'))).toEqual({ label: 'Sep', title: 'September 2026' });
  });

  it('names a week by its Sunday', () => {
    expect(pointLabels('weekly', point('2026-11-01', '2026-11-07'))).toEqual({ label: '1 Nov', title: '1 Nov – 7 Nov 2026' });
  });

  it('names a day with its weekday', () => {
    expect(pointLabels('daily', point('2026-11-02', '2026-11-02'))).toEqual({ label: '2 Nov', title: 'Mon, 2 Nov 2026' });
  });
});

describe('lastMonths', () => {
  it('runs from the first of the earliest month to today', () => {
    expect(lastMonths(6, TODAY)).toEqual({ fromDate: '2026-06-01', toDate: '2026-11-02' });
    expect(lastMonths(1, TODAY)).toEqual({ fromDate: '2026-11-01', toDate: '2026-11-02' });
  });
});

describe('percentChange', () => {
  it('compares with the earlier amount', () => {
    expect(percentChange(84, 100)).toBe(-16);
    expect(percentChange(136, 100)).toBe(36);
    // A credit balance shrinking toward zero is a rise.
    expect(percentChange(-50, -100)).toBe(50);
  });

  it('has nothing to compare with when the earlier amount was zero', () => {
    expect(percentChange(5000, 0)).toBeNull();
  });
});
