import { parsePmsFactors, DEFAULT_PMS_FACTORS } from '@/store/pms-factors';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('parsePmsFactors', () => {
  it('returns all-selected defaults when storage is empty', () => {
    expect(parsePmsFactors(null)).toEqual(DEFAULT_PMS_FACTORS);
  });

  it('returns defaults on malformed JSON', () => {
    expect(parsePmsFactors('not json')).toEqual(DEFAULT_PMS_FACTORS);
  });

  it('returns defaults when the stored value is not an object', () => {
    expect(parsePmsFactors(JSON.stringify('nope'))).toEqual(DEFAULT_PMS_FACTORS);
  });

  it('round-trips a well-formed selection', () => {
    const value = { ...DEFAULT_PMS_FACTORS, food: false };
    expect(parsePmsFactors(JSON.stringify(value))).toEqual(value);
  });

  it('honors an explicitly removed group', () => {
    expect(parsePmsFactors(JSON.stringify({ calm: false })).calm).toBe(false);
  });

  it('defaults a missing key to true (opt-out invariant)', () => {
    const parsed = parsePmsFactors(JSON.stringify({ calm: false }));
    expect(parsed.sleep).toBe(true);
    expect(parsed.food).toBe(true);
  });

  it('ignores unknown keys', () => {
    const parsed = parsePmsFactors(JSON.stringify({ calm: false, bogus: true }));
    expect(parsed).toEqual({ ...DEFAULT_PMS_FACTORS, calm: false });
    expect('bogus' in parsed).toBe(false);
  });

  it('coerces a non-boolean value to true', () => {
    expect(parsePmsFactors(JSON.stringify({ food: 'yes' })).food).toBe(true);
  });
});
