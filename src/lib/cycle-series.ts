import { dayToYmd, ymdToDay, type LightEvent, type MintedMoon } from '@/lib/moon-light';

// The effort axis of the You tab's effort-vs-impact chart, one point per
// confirmed cycle (a minted moon on the shelf). Effort here is the honest,
// literal reading — the number of distinct days she earned any light inside
// that cycle window ("days you showed up") — not the mint's weighted fullness,
// which is a different, key-day-biased measure. Pure so it unit-tests like the
// rest of lib; the store joins the impact reads onto these points by anchor.

export type CyclePoint = {
  cycleStart: string; // YYYY-MM-DD — also the impact-read anchor
  cycleEnd: string; // YYYY-MM-DD, exclusive
  label: string; // short month of the cycle's start, e.g. "Apr"
  engagedDays: number; // distinct days with any light in [start, end)
  span: number; // calendar days in the cycle
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
