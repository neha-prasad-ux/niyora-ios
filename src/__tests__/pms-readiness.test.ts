import { parseReadiness, freshReadiness } from '@/store/pms-readiness';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const TODAY = '2026-06-28';

describe('parseReadiness', () => {
  it('returns fresh state when storage is empty', () => {
    expect(parseReadiness(null, TODAY)).toEqual(freshReadiness(TODAY));
  });

  it('returns fresh state on malformed JSON', () => {
    expect(parseReadiness('not json', TODAY)).toEqual(freshReadiness(TODAY));
  });

  it("resets to fresh when the stored day is not today", () => {
    const yesterday = {
      date: '2026-06-27',
      checks: { calcium: true, micronutrient: true, steady: true, antiInflammatory: true, woundDown: true },
      doneForToday: true,
    };
    expect(parseReadiness(JSON.stringify(yesterday), TODAY)).toEqual(freshReadiness(TODAY));
  });

  it('reads today\'s checks back', () => {
    const state = {
      date: TODAY,
      checks: { calcium: true, micronutrient: false, steady: true, antiInflammatory: false, woundDown: false },
      doneForToday: false,
    };
    const parsed = parseReadiness(JSON.stringify(state), TODAY);
    expect(parsed.checks.calcium).toBe(true);
    expect(parsed.checks.steady).toBe(true);
    expect(parsed.checks.micronutrient).toBe(false);
  });

  it('coerces missing checks to false and honors doneForToday', () => {
    const state = { date: TODAY, checks: { calcium: true }, doneForToday: true };
    const parsed = parseReadiness(JSON.stringify(state), TODAY);
    expect(parsed.checks.calcium).toBe(true);
    expect(parsed.checks.woundDown).toBe(false);
    expect(parsed.doneForToday).toBe(true);
  });
});
