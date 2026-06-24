import { isInPmsWindow, pmsOffsetDays, daysUntilPmsWindow } from './pms-window';

// A predicted period start; with a 28-day cycle the next period lands 2026-06-29.
const START = '2026-06-01';
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('isInPmsWindow', () => {
  it('is false when no date is set', () => {
    expect(isInPmsWindow(null, 28, d(2026, 6, 25))).toBe(false);
  });

  it('is true in the days just before the predicted period', () => {
    expect(isInPmsWindow(START, 28, d(2026, 6, 25))).toBe(true); // 4 days before 06-29
    expect(isInPmsWindow(START, 28, d(2026, 6, 22))).toBe(true); // exactly 7 days before (edge)
  });

  it('is false just outside the leading edge', () => {
    expect(isInPmsWindow(START, 28, d(2026, 6, 21))).toBe(false); // 8 days before
  });

  it('is false mid-cycle', () => {
    expect(isInPmsWindow(START, 28, d(2026, 6, 8))).toBe(false);
    expect(isInPmsWindow(START, 28, d(2026, 6, 12))).toBe(false);
  });

  it('keeps the window open a couple days past the predicted start (late-period grace)', () => {
    expect(isInPmsWindow(START, 28, d(2026, 6, 29))).toBe(true); // predicted start day
    expect(isInPmsWindow(START, 28, d(2026, 7, 1))).toBe(true); // 2 days late, still flagged
    expect(isInPmsWindow(START, 28, d(2026, 7, 2))).toBe(false); // past the grace
  });

  it('rolls forward to later cycles on its own', () => {
    expect(isInPmsWindow(START, 28, d(2026, 7, 24))).toBe(true); // before the second period
    expect(isInPmsWindow(START, 28, d(2026, 9, 20))).toBe(true); // months later, still tracks
  });

  it('respects a longer cycle length', () => {
    // 35-day cycle: next period ~2026-07-06, so 06-25 is 11 days out, not PMS yet
    expect(isInPmsWindow(START, 35, d(2026, 6, 25))).toBe(false);
    expect(isInPmsWindow(START, 35, d(2026, 7, 2))).toBe(true); // 4 days before 07-06
  });

  it('clamps an implausible cycle length to the default', () => {
    expect(isInPmsWindow(START, 5, d(2026, 6, 25))).toBe(
      isInPmsWindow(START, 28, d(2026, 6, 25)),
    );
  });
});

describe('pmsOffsetDays', () => {
  it('is negative before the period and zero at the predicted start', () => {
    expect(pmsOffsetDays(START, 28, d(2026, 6, 25))).toBe(-4);
    expect(pmsOffsetDays(START, 28, d(2026, 6, 29))).toBe(0);
  });

  it('returns null for an unparseable date', () => {
    expect(pmsOffsetDays('not-a-date', 28, d(2026, 6, 25))).toBeNull();
  });
});

describe('daysUntilPmsWindow', () => {
  // 28-day cycle from 2026-06-01: next period 06-29, so the window opens 06-22.
  it('counts down to the window opening', () => {
    expect(daysUntilPmsWindow(START, 28, d(2026, 6, 15))).toBe(7);
    expect(daysUntilPmsWindow(START, 28, d(2026, 6, 19))).toBe(3);
  });

  it('rolls to the next cycle once a period has passed', () => {
    expect(daysUntilPmsWindow(START, 28, d(2026, 7, 2))).toBe(18); // window 07-20
  });

  it('is null when no date is set', () => {
    expect(daysUntilPmsWindow(null, 28, d(2026, 6, 15))).toBeNull();
  });
});
