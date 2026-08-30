// moment-history reaches AsyncStorage at import time for its async readers. This
// module only borrows its pure feelingCounts, so the native module is stubbed
// away rather than exercised.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

import {
  buildCycleRows,
  buildPhaseRows,
  buildProvenance,
} from './therapist-export-cycles';
import type { MomentRecord } from '../store/moment-history';

// Her real logged starts: a 26-day cycle, then a 32-day one, then one still open.
// Typical is 28, so a fixed-length projection would be wrong on both closed ones.
//
// Cycle A 2026-01-01 (26d): period Jan 1-3, build Jan 4-19, pms Jan 20-26.
// Cycle B 2026-01-27 (32d): period Jan 27-29, build Jan 30-Feb 20, pms Feb 21-27.
// Cycle C 2026-02-28 (open, typical 28): period Feb 28-Mar 2, build Mar 3-20,
//         pms Mar 21-27.
const STARTS = ['2026-01-01', '2026-01-27', '2026-02-28'];

let seq = 0;
const moment = (date: string, feeling = 'Hurt'): MomentRecord => ({
  at: `${date}T09:${String(seq++ % 60).padStart(2, '0')}:00.000Z`,
  date,
  entry: 'something she wrote',
  feeling,
  constellation: 'Grief',
});

const rowFor = (date: string, phase: string, moments: readonly MomentRecord[]) =>
  buildPhaseRows(moments, STARTS, 28).find(
    (r) => r.cycleStart === date && r.phase === phase,
  );

describe('buildProvenance', () => {
  it('returns null without moments', () => {
    expect(buildProvenance([], STARTS)).toBeNull();
  });

  // No logged period is not nothing to show: her words, threads and questions
  // stand on their own, they just arrive with an empty cycle map.
  it('still builds a header when no period was ever logged', () => {
    expect(buildProvenance([moment('2026-01-22')], [])).toMatchObject({
      entries: 1,
      daysLogged: 1,
      cyclesCovered: 0,
    });
  });

  it('spans oldest to newest and counts distinct days, not entries', () => {
    const moments = [
      moment('2026-01-22'),
      moment('2026-01-22'),
      moment('2026-01-23'),
    ];
    expect(buildProvenance(moments, STARTS)).toEqual({
      from: '2026-01-22',
      to: '2026-01-23',
      spanDays: 2,
      cyclesCovered: 0, // no logged start falls inside this two-day span
      daysLogged: 2,
      entries: 3,
    });
  });

  it('counts the cycles whose start falls inside the span', () => {
    const moments = [moment('2026-01-01'), moment('2026-02-27')];
    expect(buildProvenance(moments, STARTS)).toMatchObject({
      spanDays: 58,
      cyclesCovered: 2,
    });
  });
});

describe('buildCycleRows', () => {
  it('returns [] with no moments and with no logged period', () => {
    expect(buildCycleRows([], STARTS)).toEqual([]);
    expect(buildCycleRows([moment('2026-01-22')], [])).toEqual([]);
  });

  it('measures a short cycle and a long one, newest first', () => {
    const moments = [moment('2026-01-10'), moment('2026-02-20')];
    expect(buildCycleRows(moments, STARTS)).toEqual([
      { start: '2026-01-27', lengthDays: 32, daysLogged: 1, entries: 1 },
      { start: '2026-01-01', lengthDays: 26, daysLogged: 1, entries: 1 },
    ]);
  });

  it('leaves an open cycle without a length', () => {
    const rows = buildCycleRows([moment('2026-03-10')], STARTS);
    expect(rows).toEqual([
      { start: '2026-02-28', lengthDays: null, daysLogged: 1, entries: 1 },
    ]);
  });

  // A 76-day gap is her not logging, not one long cycle, so it gets no length.
  it('refuses to call a stretch she stopped logging one cycle', () => {
    const starts = ['2026-02-28', '2026-05-15'];
    expect(buildCycleRows([moment('2026-03-10')], starts)).toEqual([
      { start: '2026-02-28', lengthDays: null, daysLogged: 1, entries: 1 },
    ]);
  });

  it('separates distinct days from entry count', () => {
    const moments = [moment('2026-01-22'), moment('2026-01-22'), moment('2026-01-23')];
    expect(buildCycleRows(moments, STARTS)).toEqual([
      { start: '2026-01-01', lengthDays: 26, daysLogged: 2, entries: 3 },
    ]);
  });
});

describe('buildPhaseRows', () => {
  it('returns [] with no moments and with no logged period', () => {
    expect(buildPhaseRows([], STARTS, 28)).toEqual([]);
    expect(buildPhaseRows([moment('2026-01-22')], [], 28)).toEqual([]);
  });

  // The bug this file exists to prevent: the span only covers 3 of the 7 PMS
  // days, so the denominator is 3. Claiming 7 turns 4 days we never looked at
  // into 4 symptom-free days on the doctor's sheet.
  it('clips the denominator to the export span', () => {
    const moments = [moment('2026-01-22'), moment('2026-01-24')];
    expect(buildPhaseRows(moments, STARTS, 28)).toEqual([
      {
        cycleStart: '2026-01-01',
        phase: 'pms',
        daysInPhase: 3,
        daysLogged: 2,
        entries: 2,
        feelings: [{ feeling: 'Hurt', count: 2 }],
        source: 'logged',
      },
    ]);
  });

  it('reports the full stretch when the span covers it', () => {
    const moments = [moment('2026-01-20'), moment('2026-01-26')];
    expect(buildPhaseRows(moments, STARTS, 28)).toEqual([
      {
        cycleStart: '2026-01-01',
        phase: 'pms',
        daysInPhase: 7,
        daysLogged: 2,
        entries: 2,
        feelings: [{ feeling: 'Hurt', count: 2 }],
        source: 'logged',
      },
    ]);
  });

  // 26 days is 3 period + 16 build + 7 pms; 32 days is 3 + 22 + 7. Only the
  // build stretch grows, which is why a fixed 28 misfiles the PMS days.
  it('sizes the phases from the measured length, short cycle vs long', () => {
    const moments = [moment('2026-01-01'), moment('2026-02-27')];
    const rows = buildPhaseRows(moments, STARTS, 28);
    expect(rows.map((r) => [r.cycleStart, r.phase, r.daysInPhase, r.source])).toEqual([
      ['2026-01-27', 'build', 22, 'logged'],
      ['2026-01-27', 'pms', 7, 'logged'],
      ['2026-01-27', 'period', 3, 'logged'],
      ['2026-01-01', 'build', 16, 'logged'],
      ['2026-01-01', 'pms', 7, 'logged'],
      ['2026-01-01', 'period', 3, 'logged'],
    ]);
    // Every day of both cycles is accounted for, none twice.
    expect(rows.reduce((n, r) => n + r.daysInPhase, 0)).toBe(26 + 32);
  });

  it('emits a phase she wrote nothing in, so the blank is visible', () => {
    const moments = [moment('2026-01-01'), moment('2026-02-27')];
    expect(rowFor('2026-01-01', 'build', moments)).toMatchObject({
      daysInPhase: 16,
      daysLogged: 0,
      entries: 0,
      feelings: [],
    });
  });

  // Span Mar 1 to Mar 25 clips the open cycle at both ends: period loses Feb 28,
  // pms loses Mar 26-27. Nothing here is measured, so nothing claims 'logged'.
  it('flags an open cycle predicted and clips it at both edges', () => {
    const moments = [moment('2026-03-01'), moment('2026-03-25')];
    const rows = buildPhaseRows(moments, STARTS, 28);
    expect(rows.map((r) => [r.phase, r.daysInPhase, r.daysLogged, r.source])).toEqual([
      ['build', 18, 0, 'predicted'],
      ['pms', 5, 1, 'predicted'],
      ['period', 2, 1, 'predicted'],
    ]);
    expect(rows.every((r) => r.cycleStart === '2026-02-28')).toBe(true);
  });

  it('counts distinct days apart from entries and names her feelings by count', () => {
    const moments = [
      moment('2026-01-22', 'Hurt'),
      moment('2026-01-22', 'Angry'),
      moment('2026-01-23', 'Hurt'),
    ];
    expect(rowFor('2026-01-01', 'pms', moments)).toMatchObject({
      daysInPhase: 2,
      daysLogged: 2,
      entries: 3,
      feelings: [
        { feeling: 'Hurt', count: 2 },
        { feeling: 'Angry', count: 1 },
      ],
    });
  });
});
