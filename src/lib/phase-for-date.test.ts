import { localYmd } from './day';
import { phaseForDate } from './phase-for-date';

// Her real logged starts: a 26-day cycle, then a 32-day one. Typical is 28, so
// anywhere the measured length differs the prediction and the truth diverge.
const STARTS = ['2026-01-01', '2026-01-27', '2026-02-28'];

const p = (date: string, starts: readonly string[] = STARTS) =>
  phaseForDate(date, starts, 28);

describe('phaseForDate', () => {
  it('returns null without a usable date or any logged period', () => {
    expect(p('not-a-date')).toBeNull();
    expect(p('2026-01-10', [])).toBeNull();
  });

  it('counts cycle day from the real logged start', () => {
    expect(p('2026-01-01')).toMatchObject({ cycleDay: 1, phase: 'period' });
    expect(p('2026-01-03')).toMatchObject({ cycleDay: 3, phase: 'period' });
    expect(p('2026-01-10')).toMatchObject({ cycleDay: 10, phase: 'build' });
  });

  it('measures the cycle length between two logged starts', () => {
    expect(p('2026-01-10')).toMatchObject({ source: 'logged', cycleLength: 26 });
    expect(p('2026-02-20')).toMatchObject({ source: 'logged', cycleLength: 32 });
  });

  // The bug this file exists for: Jan 21 is day 21 of a 26-day cycle, so it is
  // PMS. Modulo-projecting a fixed 28 from Jan 1 calls it build and would file a
  // premenstrual entry under a calm day on the doctor's sheet.
  it('beats fixed-length projection on a short cycle', () => {
    expect(p('2026-01-21')).toMatchObject({ phase: 'pms', source: 'logged' });
    expect(phaseForDate('2026-01-21', ['2026-01-01'], 28)).toMatchObject({
      phase: 'build',
      source: 'predicted',
    });
  });

  it('keeps the day count but predicts the phase in an open cycle', () => {
    expect(p('2026-03-20')).toMatchObject({
      cycleDay: 21,
      source: 'predicted',
      cycleLength: 28,
    });
  });

  it('does not treat a stretch she stopped logging as one long cycle', () => {
    // Feb 28 -> May 15 is 76 days. Not a cycle, so the phase is a prediction.
    expect(p('2026-03-20', [...STARTS, '2026-05-15'])).toMatchObject({
      source: 'predicted',
      cycleLength: 28,
    });
  });

  it('falls back to modulo before the first logged period, flagged predicted', () => {
    expect(p('2025-12-20')).toMatchObject({ source: 'predicted' });
    expect(p('2026-06-01')).toMatchObject({ source: 'predicted' });
  });
});

describe('localYmd', () => {
  it('files a late-night moment under the local day, not the UTC one', () => {
    expect(localYmd(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(localYmd(new Date(2026, 10, 9, 0, 15))).toBe('2026-11-09');
  });
});
