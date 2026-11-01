import { DocNoPipe } from './doc-no.pipe';

describe('DocNoPipe', () => {
  const pipe = new DocNoPipe();

  it('drops the empty prefix of a number without a fiscal year', () => {
    expect(pipe.transform('|PE-000001')).toBe('PE-000001');
  });

  it('spaces the fiscal-year separator', () => {
    expect(pipe.transform('2082-83|PE-000005')).toBe('2082-83 | PE-000005');
  });

  it('returns an empty string for no number', () => {
    expect(pipe.transform(null)).toBe('');
  });
});
