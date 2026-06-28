import { parsePmsSymptoms, DEFAULT_PMS_SYMPTOMS } from '@/store/pms-symptoms';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('parsePmsSymptoms', () => {
  it('returns nothing selected when storage is empty', () => {
    expect(parsePmsSymptoms(null)).toEqual(DEFAULT_PMS_SYMPTOMS);
  });

  it('returns defaults on malformed JSON', () => {
    expect(parsePmsSymptoms('not json')).toEqual(DEFAULT_PMS_SYMPTOMS);
  });

  it('returns defaults when the stored value is not an object', () => {
    expect(parsePmsSymptoms(JSON.stringify(42))).toEqual(DEFAULT_PMS_SYMPTOMS);
  });

  it('round-trips a well-formed selection', () => {
    const value = { ...DEFAULT_PMS_SYMPTOMS, anxious: true, low: true };
    expect(parsePmsSymptoms(JSON.stringify(value))).toEqual(value);
  });

  it('defaults a missing key to false (opt-in)', () => {
    const parsed = parsePmsSymptoms(JSON.stringify({ anxious: true }));
    expect(parsed.anxious).toBe(true);
    expect(parsed.foggy).toBe(false);
  });

  it('ignores unknown keys', () => {
    const parsed = parsePmsSymptoms(JSON.stringify({ anxious: true, bogus: true }));
    expect(parsed).toEqual({ ...DEFAULT_PMS_SYMPTOMS, anxious: true });
    expect('bogus' in parsed).toBe(false);
  });

  it('coerces a non-boolean value to false', () => {
    expect(parsePmsSymptoms(JSON.stringify({ anxious: 'yes' })).anxious).toBe(false);
  });
});
