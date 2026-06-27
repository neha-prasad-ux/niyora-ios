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
    const value = { ...DEFAULT_PMS_FACTORS, calcium: false, movement: false };
    expect(parsePmsFactors(JSON.stringify(value))).toEqual(value);
  });

  it('honors an explicitly removed factor', () => {
    expect(parsePmsFactors(JSON.stringify({ stress: false })).stress).toBe(false);
  });

  it('defaults a missing key to true (opt-out invariant)', () => {
    const parsed = parsePmsFactors(JSON.stringify({ stress: false }));
    expect(parsed.sleep).toBe(true);
    expect(parsed.gutInflammation).toBe(true);
  });

  it('ignores unknown keys', () => {
    const parsed = parsePmsFactors(JSON.stringify({ stress: false, bogus: true }));
    expect(parsed).toEqual({ ...DEFAULT_PMS_FACTORS, stress: false });
    expect('bogus' in parsed).toBe(false);
  });

  it('coerces a non-boolean value to true', () => {
    expect(parsePmsFactors(JSON.stringify({ calcium: 'yes' })).calcium).toBe(true);
  });
});
