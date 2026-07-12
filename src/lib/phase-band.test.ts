jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { bandHeadline, derivePhaseBand, type BandPhase } from './phase-band';
import { derivePhase } from './today-action';
import type { PmsPrefs } from '@/store/pms-prefs';

// Same fixture as today-action.test: period started 2026-01-01, 28-day cycle.
// Next predicted period: Jan 29. PMS days: Jan 22-28. Period days: Jan 29-31.
const PREFS: PmsPrefs = { pmsMode: true, lastPeriodStart: '2026-01-01', cycleLength: 28 };

const at = (m: number, d: number) => new Date(2026, m - 1, d, 9, 0);

describe('derivePhaseBand', () => {
  it('is null when PMS mode is off, the anchor is missing, or unparseable', () => {
    expect(derivePhaseBand({ ...PREFS, pmsMode: false }, at(1, 10))).toBeNull();
    expect(derivePhaseBand({ ...PREFS, lastPeriodStart: null }, at(1, 10))).toBeNull();
    expect(derivePhaseBand({ ...PREFS, lastPeriodStart: 'not-a-date' }, at(1, 10))).toBeNull();
  });

  it('splits the cycle into build/pms/period fractions that sum to 1', () => {
    const band = derivePhaseBand(PREFS, at(1, 10));
    expect(band?.segments.map((s) => s.phase)).toEqual(['build', 'pms', 'period']);
    expect(band?.segments.map((s) => s.fraction)).toEqual([18 / 28, 7 / 28, 3 / 28]);
    const sum = band!.segments.reduce((acc, s) => acc + s.fraction, 0);
    expect(sum).toBeCloseTo(1);
  });

  it('places the current phase on the selector ladder', () => {
    expect(derivePhaseBand(PREFS, at(1, 21))?.current).toBe('build'); // prep, still build days
    expect(derivePhaseBand(PREFS, at(1, 22))?.current).toBe('pms'); // offset -7
    expect(derivePhaseBand(PREFS, at(1, 28))?.current).toBe('pms'); // offset -1
    expect(derivePhaseBand(PREFS, at(1, 29))?.current).toBe('period'); // offset 0
    expect(derivePhaseBand(PREFS, at(1, 31))?.current).toBe('period'); // offset +2
    expect(derivePhaseBand(PREFS, at(2, 1))?.current).toBe('build'); // offset +3
  });

  it('never disagrees with derivePhase across a full cycle', () => {
    const collapse: Record<string, BandPhase> = {
      window: 'pms',
      period: 'period',
      prep: 'build',
      open: 'build',
    };
    for (let day = 1; day <= 56; day++) {
      const now = new Date(2026, 0, day, 9, 0);
      const band = derivePhaseBand(PREFS, now);
      expect(band?.current).toBe(collapse[derivePhase(PREFS, true, now)]);
    }
  });

  it('walks the pearl through each segment, centered on the day', () => {
    // Feb 1 is the first build day (offset +3): first of 18 build days.
    expect(derivePhaseBand(PREFS, at(2, 1))?.pearl).toBeCloseTo(0.5 / 18);
    // Jan 25 is the 4th of 7 PMS days: dead center.
    expect(derivePhaseBand(PREFS, at(1, 25))?.pearl).toBeCloseTo(3.5 / 7);
    // Jan 29 is the first of 3 period days.
    expect(derivePhaseBand(PREFS, at(1, 29))?.pearl).toBeCloseTo(0.5 / 3);
  });

  it('counts the day within the current segment for copy', () => {
    expect(derivePhaseBand(PREFS, at(1, 22))?.dayWithin).toBe(1);
    expect(derivePhaseBand(PREFS, at(1, 23))?.dayWithin).toBe(2);
    expect(derivePhaseBand(PREFS, at(1, 31))?.dayWithin).toBe(3);
  });
});

describe('bandHeadline', () => {
  it('is null exactly when the band is null', () => {
    expect(bandHeadline({ ...PREFS, pmsMode: false }, at(1, 10))).toBeNull();
    expect(bandHeadline({ ...PREFS, lastPeriodStart: null }, at(1, 10))).toBeNull();
  });

  it('hedges distant counts and sharpens near ones', () => {
    expect(bandHeadline(PREFS, at(1, 10))).toBe('About 12 days to PMS');
    expect(bandHeadline(PREFS, at(1, 14))).toBe('About 8 days to PMS');
    expect(bandHeadline(PREFS, at(1, 15))).toBe('7 days to PMS');
    expect(bandHeadline(PREFS, at(1, 16))).toBe('6 days to PMS');
    expect(bandHeadline(PREFS, at(1, 21))).toBe('PMS likely tomorrow');
  });

  it('names PMS days by their day number, then eases into period days', () => {
    expect(bandHeadline(PREFS, at(1, 22))).toBe('PMS days · day 1');
    expect(bandHeadline(PREFS, at(1, 24))).toBe('PMS days · day 3');
    expect(bandHeadline(PREFS, at(1, 29))).toBe('Period days · take it light');
    expect(bandHeadline(PREFS, at(1, 31))).toBe('Period days · take it light');
  });

  it('never says the word window', () => {
    for (let day = 1; day <= 56; day++) {
      const line = bandHeadline(PREFS, new Date(2026, 0, day, 9, 0));
      expect(line?.toLowerCase()).not.toContain('window');
    }
  });
});
