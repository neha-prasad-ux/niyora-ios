import { dayToYmd, localYmd, ymdToDay, type LightEvent, type MintedMoon } from '@/lib/moon-light';
import { clampCycleLength } from '@/lib/pms-window';

// The effort axis of the You tab's effort-vs-impact chart, one point per
// confirmed cycle (a minted moon on the shelf). Effort here is the honest,
// literal reading, the number of distinct days she earned any light inside
// that cycle window ("days you showed up"), not the mint's weighted fullness,
// which is a different, key-day-biased measure. Pure so it unit-tests like the
// rest of lib; the store joins the impact reads onto these points by anchor.

export type CyclePoint = {
  cycleStart: string; // YYYY-MM-DD, also the impact-read anchor
  cycleEnd: string; // YYYY-MM-DD, exclusive
  label: string; // short month of the cycle's start, e.g. "Apr" (or "Now" live)
  engagedDays: number; // distinct days with any light in [start, end)
  span: number; // calendar days in the cycle
  provisional?: boolean; // the current, unfinished cycle, effort so far, no mint yet
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function monthLabel(ymd: string): string {
  const m = /^\d{4}-(\d{2})-\d{2}$/.exec(ymd);
  if (!m) return '';
  const idx = Number(m[1]) - 1;
  return MONTHS[idx] ?? '';
}

/**
 * Build the ordered per-cycle effort series from the moon shelf and the light
 * ledger. Cycles are ordered oldest-first (as the shelf mints them), so the
 * chart reads left-to-right in time.
 */
export function buildCycleSeries(shelf: readonly MintedMoon[], ledger: readonly LightEvent[]): CyclePoint[] {
  const engagedDays = new Set(ledger.map((e) => e.date));
  const points: CyclePoint[] = [];
  for (const moon of shelf) {
    const start = ymdToDay(moon.cycleStart);
    const end = ymdToDay(moon.cycleEnd);
    if (start == null || end == null || end <= start) continue;
    let engaged = 0;
    for (let d = start; d < end; d++) {
      if (engagedDays.has(dayToYmd(d))) engaged++;
    }
    points.push({
      cycleStart: moon.cycleStart,
      cycleEnd: moon.cycleEnd,
      label: monthLabel(moon.cycleStart),
      engagedDays: engaged,
      span: end - start,
    });
  }
  return points.sort((a, b) => (a.cycleStart < b.cycleStart ? -1 : a.cycleStart > b.cycleStart ? 1 : 0));
}

/**
 * The live point for the cycle in progress, the one that hasn't minted a moon
 * yet. Effort is the days engaged so far (through today, never counting the
 * future), so the chart moves the moment she shows up instead of staying a
 * cycle behind. Impact is left to fill in when she reflects at cycle end.
 *
 * Returns null with no period logged, or before the anchor. Labelled "Now" so
 * it reads as live at the right edge of the chart.
 */
export function currentCyclePoint(
  lastPeriodStart: string | null,
  cycleLength: number,
  ledger: readonly LightEvent[],
  now: Date,
): CyclePoint | null {
  if (lastPeriodStart == null) return null;
  const anchor = ymdToDay(lastPeriodStart);
  const today = ymdToDay(localYmd(now));
  if (anchor == null || today == null || today < anchor) return null;

  const len = clampCycleLength(cycleLength);
  const cyclesElapsed = Math.floor((today - anchor) / len);
  const start = anchor + cyclesElapsed * len;
  const end = start + len;

  const engagedDates = new Set(ledger.map((e) => e.date));
  const throughToday = Math.min(today + 1, end); // count up to and including today
  let engaged = 0;
  for (let d = start; d < throughToday; d++) {
    if (engagedDates.has(dayToYmd(d))) engaged++;
  }

  return {
    cycleStart: dayToYmd(start),
    cycleEnd: dayToYmd(end),
    label: 'Now',
    engagedDays: engaged,
    span: len,
    provisional: true,
  };
}
