import {
  isInPmsWindow,
  pmsOffsetDays,
  daysUntilPmsWindow,
  nextPmsWindowStartDate,
  learnedCycleLength,
} from './pms-window';

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

describe('nextPmsWindowStartDate', () => {
  // 28-day cycle from 2026-06-01: window opens 06-22, next one 07-20.
  const ymd = (date: Date | null) =>
    date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null;

  it('returns the upcoming window start mid-cycle', () => {
    expect(ymd(nextPmsWindowStartDate(START, 28, d(2026, 6, 8)))).toBe('2026-06-22');
  });

  it('returns today when today is exactly the window start', () => {
    expect(ymd(nextPmsWindowStartDate(START, 28, d(2026, 6, 22)))).toBe('2026-06-22');
  });

  it('rolls forward to the next cycle once inside or past a window', () => {
    expect(ymd(nextPmsWindowStartDate(START, 28, d(2026, 6, 25)))).toBe('2026-07-20'); // inside current window
    expect(ymd(nextPmsWindowStartDate(START, 28, d(2026, 7, 5)))).toBe('2026-07-20'); // just past it
  });

  it('returns a local Date at midnight', () => {
    const date = nextPmsWindowStartDate(START, 28, d(2026, 6, 8));
    expect(date?.getHours()).toBe(0);
    expect(date?.getMinutes()).toBe(0);
  });

  it('is null when no date is set', () => {
    expect(nextPmsWindowStartDate(null, 28, d(2026, 6, 8))).toBeNull();
  });
});

describe('learnedCycleLength', () => {
  it('is null with fewer than two logged periods', () => {
    expect(learnedCycleLength([])).toBeNull();
    expect(learnedCycleLength(['2026-06-01'])).toBeNull();
  });

  it('measures the gap between two periods', () => {
    expect(learnedCycleLength(['2026-05-02', '2026-05-31'])).toBe(29);
  });

  it('averages the gaps across several cycles', () => {
    // gaps: 28, 30 -> mean 29
    expect(learnedCycleLength(['2026-04-03', '2026-05-01', '2026-05-31'])).toBe(29);
  });

  it('is order-independent (sorts before measuring)', () => {
    expect(learnedCycleLength(['2026-05-31', '2026-05-02'])).toBe(29);
  });

  it('drops an implausibly short gap (spotting / double log)', () => {
    // 2-day gap is ignored; the real 28-day gap is used.
    expect(learnedCycleLength(['2026-05-01', '2026-05-03', '2026-05-31'])).toBe(28);
  });

  it('drops an implausibly long gap (a skipped log)', () => {
    // 90-day gap ignored; remaining 27-day gap used.
    expect(learnedCycleLength(['2026-01-01', '2026-04-01', '2026-04-28'])).toBe(27);
  });

  it('is null when no gap is plausible', () => {
    expect(learnedCycleLength(['2026-05-01', '2026-05-02'])).toBeNull();
  });

  it('only averages the most recent six cycles', () => {
    // Eight dates -> seven gaps: an old 22-day gap then six 30s. Only the last
    // six (all 30) should count, so the answer is 30 not ~29.
    const starts = [
      '2026-01-01',
      '2026-01-23', // 22-day gap, older than the last-6 window
      '2026-02-22',
      '2026-03-24',
      '2026-04-23',
      '2026-05-23',
      '2026-06-22',
      '2026-07-22',
    ];
    expect(learnedCycleLength(starts)).toBe(30);
  });
});
