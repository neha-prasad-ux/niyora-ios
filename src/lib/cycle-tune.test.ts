jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { prefsAfterPeriodLog, tuneCycleLength } from './cycle-tune';
import { DEFAULT_PMS_PREFS } from '@/store/pms-prefs';

describe('tuneCycleLength', () => {
  it('returns null with fewer than two plausible intervals', () => {
    expect(tuneCycleLength([])).toBeNull();
    expect(tuneCycleLength(['2026-03-01'])).toBeNull();
    expect(tuneCycleLength(['2026-03-01', '2026-02-01'])).toBeNull(); // one interval
  });

  it('takes the median of three intervals', () => {
    // Intervals newest-first: 27, 30, 33 -> median 30.
    expect(tuneCycleLength(['2026-04-01', '2026-03-05', '2026-02-03', '2026-01-01'])).toBe(30);
  });

  it('rounds the mean of the middle pair for two intervals', () => {
    // Intervals: 28, 31 -> round(29.5) = 30.
    expect(tuneCycleLength(['2026-03-31', '2026-03-03', '2026-01-31'])).toBe(30);
  });

  it('only considers the most recent three intervals', () => {
    // Newest three intervals are 26, 26, 26; an older 38 must not pull the median.
    expect(
      tuneCycleLength(['2026-05-20', '2026-04-24', '2026-03-29', '2026-03-03', '2026-01-24']),
    ).toBe(26);
  });

  it('ignores implausibly short gaps (double-logged period)', () => {
    // 3-day gap is spotting/duplicate, leaving only one plausible interval -> null.
    expect(tuneCycleLength(['2026-03-04', '2026-03-01', '2026-02-01'])).toBeNull();
  });

  it('ignores implausibly long gaps (an unlogged cycle between)', () => {
    // 90-day gap says nothing; the remaining two 28s still tune.
    expect(
      tuneCycleLength(['2026-07-28', '2026-06-30', '2026-06-02', '2026-03-04']),
    ).toBe(28);
  });

  it('clamps into the supported 20..40 range', () => {
    // Two 55-day intervals pass the plausibility filter but exceed support.
    expect(tuneCycleLength(['2026-04-24', '2026-02-28', '2026-01-04'])).toBe(40);
    // Intervals 16 and 17 clamp up to 20.
    expect(tuneCycleLength(['2026-02-03', '2026-01-18', '2026-01-01'])).toBe(20);
  });
});

describe('prefsAfterPeriodLog', () => {
  it('turns PMS mode on and anchors to the newest start', () => {
    const next = prefsAfterPeriodLog(DEFAULT_PMS_PREFS, ['2026-07-10']);
    expect(next.pmsMode).toBe(true);
    expect(next.lastPeriodStart).toBe('2026-07-10');
    expect(next.cycleLength).toBe(DEFAULT_PMS_PREFS.cycleLength); // nothing to tune yet
  });

  it('never moves the anchor backward when an old period is logged', () => {
    const prefs = { pmsMode: true, lastPeriodStart: '2026-07-01', cycleLength: 28 };
    const next = prefsAfterPeriodLog(prefs, ['2026-07-01', '2026-03-01']);
    expect(next.lastPeriodStart).toBe('2026-07-01');
  });

  it('adopts the tuned length once history supports one', () => {
    const prefs = { pmsMode: true, lastPeriodStart: '2026-01-01', cycleLength: 28 };
    const next = prefsAfterPeriodLog(prefs, ['2026-03-05', '2026-02-02', '2026-01-02']);
    // Intervals 31, 31 -> median 31.
    expect(next.cycleLength).toBe(31);
    expect(next.lastPeriodStart).toBe('2026-03-05');
  });
});
