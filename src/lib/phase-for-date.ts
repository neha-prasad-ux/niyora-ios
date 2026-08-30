// Where in her cycle a past day sat, and how much we actually know about it.
//
// lib/pms-window predicts forward from a single anchor by modulo. That is right
// for today and wrong for history: back-projecting a fixed 28 across months of
// real cycles that ran 26, 31, 29 puts old moments in the wrong phase, and the
// error grows the further back you go. So this reads store/period-history, which
// holds her real logged period starts, and only falls back to prediction where
// there is no logged start to lean on.
//
// Every result carries `source`. A phase we measured and a phase we guessed are
// not the same claim, and the therapist export has to show which is which.

import type { BandPhase } from './phase-band';
import {
  clampCycleLength,
  parseDayNumber,
  PMS_GRACE_AFTER_DAYS,
  PMS_WINDOW_BEFORE_DAYS,
} from './pms-window';

export type PhaseSource = 'logged' | 'predicted';

export type DatePhase = {
  /** 1-based day of the cycle. Day 1 is the period start. */
  cycleDay: number;
  phase: BandPhase;
  /**
   * 'logged'    both ends of this cycle are real logged starts, so the day count
   *             and the phase are measured fact.
   * 'predicted' at least one end is our forecast. Still useful, not evidence.
   */
  source: PhaseSource;
  /** Cycle length used: measured when logged, clamped typical otherwise. */
  cycleLength: number;
};

// A gap outside this range is not one cycle, it is a stretch where she stopped
// logging. clampCycleLength uses the same bounds for the same reason.
const MIN_CYCLE = 20;
const MAX_CYCLE = 40;

// Identical rule to derivePhaseBand, so the export, the strip and the reminders
// can never disagree about what phase a day was in.
function classify(offset: number, len: number): { cycleDay: number; phase: BandPhase } {
  const phase: BandPhase =
    offset <= PMS_GRACE_AFTER_DAYS
      ? 'period'
      : offset >= len - PMS_WINDOW_BEFORE_DAYS
        ? 'pms'
        : 'build';
  return { cycleDay: offset + 1, phase };
}

/**
 * The cycle position of one calendar day (YYYY-MM-DD).
 *
 * `periodStarts` is every start she has logged, in any order. Pass
 * pms-prefs.lastPeriodStart alongside store/period-history, duplicates are fine.
 * Returns null when the date is unparseable or she has logged no period at all,
 * because a cycle we invented from nothing is worse than an empty column.
 */
export function phaseForDate(
  date: string,
  periodStarts: readonly (string | null | undefined)[],
  cycleLength: number,
): DatePhase | null {
  const d = parseDayNumber(date);
  if (d == null) return null;

  const starts = [
    ...new Set(
      periodStarts
        .map((s) => (s ? parseDayNumber(s) : null))
        .filter((n): n is number => n != null),
    ),
  ].sort((a, b) => a - b);
  if (starts.length === 0) return null;

  const typical = clampCycleLength(cycleLength);

  // Nearest logged start on or before this day, and the next one after it.
  let prev: number | null = null;
  let next: number | null = null;
  for (const s of starts) {
    if (s <= d) prev = s;
    else {
      next = s;
      break;
    }
  }

  // Closed cycle: both ends logged, so the length is measured, not assumed.
  if (prev != null && next != null) {
    const measured = next - prev;
    if (measured >= MIN_CYCLE && measured <= MAX_CYCLE) {
      return {
        ...classify(d - prev, measured),
        source: 'logged',
        cycleLength: measured,
      };
    }
  }

  // Open cycle: the start is real (so the day count is fact) but the next period
  // has not arrived or was never logged, so the phase leans on the typical length.
  if (prev != null && d - prev <= MAX_CYCLE) {
    return { ...classify(d - prev, typical), source: 'predicted', cycleLength: typical };
  }

  // Nothing brackets this day: it predates her first logged period, or sits in a
  // stretch she never logged. Back-project by modulo from the nearest start. This
  // drifts, which is the whole reason it is flagged.
  const anchor = prev ?? starts[0];
  const offset = (((d - anchor) % typical) + typical) % typical;
  return { ...classify(offset, typical), source: 'predicted', cycleLength: typical };
}
