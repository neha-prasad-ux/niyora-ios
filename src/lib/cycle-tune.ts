import {
  MAX_CYCLE_LENGTH,
  MIN_CYCLE_LENGTH,
  type PmsPrefs,
} from '@/store/pms-prefs';
import { latestStart } from '@/store/period-history';

// Turning logged periods into a better prediction. lib/pms-window predicts from
// one anchor date + a typical length; this module observes the real starts she
// logs and tunes both. Kept separate from pms-window on purpose: that file is
// prediction (read-only over prefs), this one is observation (produces new
// prefs). Pure, so the median and the guards are unit-testable.

// Interval plausibility guards. Below the floor two starts are almost surely
// the same period logged twice (or spotting); above the ceiling a whole cycle
// went unlogged, so the gap says nothing about her real length.
export const MIN_PLAUSIBLE_INTERVAL_DAYS = 15;
export const MAX_PLAUSIBLE_INTERVAL_DAYS = 60;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Same UTC-anchored day math as lib/pms-window, so tuned lengths and window
// predictions never disagree about what a "day apart" means.
function parseDayNumber(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY);
}

/**
 * The observed cycle length: the median of the last (up to) three plausible
 * intervals between consecutive logged starts. Needs at least two plausible
 * intervals (i.e. three good starts) before it dares override the onboarding
 * answer — one interval is an anecdote, not a rhythm. Returns null until then.
 */
export function tuneCycleLength(startsNewestFirst: readonly string[]): number | null {
  const days = startsNewestFirst
    .map(parseDayNumber)
    .filter((d): d is number => d != null);

  const intervals: number[] = [];
  for (let i = 0; i + 1 < days.length; i += 1) {
    const gap = days[i] - days[i + 1]; // newest-first, so earlier entry is later in time
    if (gap >= MIN_PLAUSIBLE_INTERVAL_DAYS && gap <= MAX_PLAUSIBLE_INTERVAL_DAYS) {
      intervals.push(gap);
    }
  }
  if (intervals.length < 2) return null;

  const recent = intervals.slice(0, 3).sort((a, b) => a - b);
  const mid = Math.floor(recent.length / 2);
  const median =
    recent.length % 2 === 1 ? recent[mid] : Math.round((recent[mid - 1] + recent[mid]) / 2);
  return Math.max(MIN_CYCLE_LENGTH, Math.min(MAX_CYCLE_LENGTH, median));
}

/**
 * Prefs after a period is logged: anchor the prediction on the newest logged
 * start (never moving backward — logging an old period must not rewind the
 * cycle), switch PMS mode on (she gave us a cycle, mirroring the toggle's
 * seeding), and adopt the tuned length once the history can support one.
 */
export function prefsAfterPeriodLog(
  prefs: PmsPrefs,
  startsNewestFirst: readonly string[],
): PmsPrefs {
  const newest = latestStart([...startsNewestFirst]);
  const current = prefs.lastPeriodStart;
  const lastPeriodStart = newest == null || (current != null && current > newest) ? current : newest;
  return {
    pmsMode: true,
    lastPeriodStart,
    cycleLength: tuneCycleLength(startsNewestFirst) ?? prefs.cycleLength,
  };
}
