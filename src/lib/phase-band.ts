// The Now card's cycle strip: one cycle flattened into three chronological
// segments (build -> PMS -> period), a pearl marking today, and the phase
// headline that captions the coached action. Pure functions over the same
// prediction math as lib/pms-window, so the strip, the reminders, and the
// action selector can never disagree about where she is.
//
// Copy rule: the screen never says "window", that is forecast jargon. The
// premenstrual stretch is "PMS days", the bleed is "period days", the long
// clear stretch is "build days". ("Window" survives only as an internal name
// in lib/pms-window.)

import {
  clampCycleLength,
  daysUntilPmsWindow,
  pmsOffsetDays,
  PMS_GRACE_AFTER_DAYS,
  PMS_WINDOW_BEFORE_DAYS,
} from '@/lib/pms-window';
import type { PmsPrefs } from '@/store/pms-prefs';

export type BandPhase = 'build' | 'pms' | 'period';

export type PhaseBand = {
  /** Chronological left-to-right: build, pms, period. Fractions sum to 1. */
  segments: { phase: BandPhase; fraction: number }[];
  current: BandPhase;
  /** Today's position inside the current segment, 0..1 (centered on the day). */
  pearl: number;
  /** 1-based day within the current segment, for "PMS days · day 2" copy. */
  dayWithin: number;
};

// The period segment covers the predicted start plus the grace days, 
// the same [0, +2] stretch the selector calls the `period` phase.
const PERIOD_DAYS = PMS_GRACE_AFTER_DAYS + 1;

/**
 * The whole strip in one derivation. The band is anchored just after the
 * period days end, so the cycle reads left-to-right as build -> PMS -> period
 * and the PMS stretch is the visible approach, not a wraparound. null when
 * PMS mode is off or there is no usable anchor, never render a fake cycle.
 */
export function derivePhaseBand(prefs: PmsPrefs, now: Date): PhaseBand | null {
  if (!prefs.pmsMode || prefs.lastPeriodStart == null) return null;
  const offset = pmsOffsetDays(prefs.lastPeriodStart, prefs.cycleLength, now);
  if (offset == null) return null;

  const len = clampCycleLength(prefs.cycleLength);
  const pmsDays = PMS_WINDOW_BEFORE_DAYS;
  const buildDays = len - pmsDays - PERIOD_DAYS;

  // Cycle day counted from the nearest predicted period start, in [0, len).
  const d = ((offset % len) + len) % len;
  const current: BandPhase =
    d <= PMS_GRACE_AFTER_DAYS ? 'period' : d >= len - pmsDays ? 'pms' : 'build';
  const within =
    current === 'period' ? d : current === 'pms' ? d - (len - pmsDays) : d - PERIOD_DAYS;
  const segDays = current === 'period' ? PERIOD_DAYS : current === 'pms' ? pmsDays : buildDays;

  return {
    segments: [
      { phase: 'build', fraction: buildDays / len },
      { phase: 'pms', fraction: pmsDays / len },
      { phase: 'period', fraction: PERIOD_DAYS / len },
    ],
    current,
    pearl: (within + 0.5) / segDays,
    dayWithin: within + 1,
  };
}

/**
 * The card's eyebrow line, phrased as runway rather than deadline. Distant
 * counts are hedged with "about", precision two weeks out would be false,
 * and false precision teaches her to distrust the near-term counts too.
 */
export function bandHeadline(prefs: PmsPrefs, now: Date): string | null {
  const band = derivePhaseBand(prefs, now);
  if (band == null) return null;
  if (band.current === 'period') return 'Period days · take it light';
  if (band.current === 'pms') return `PMS days · day ${band.dayWithin}`;
  const until = daysUntilPmsWindow(prefs.lastPeriodStart, prefs.cycleLength, now);
  if (until == null || until < 1) return 'Build days';
  if (until === 1) return 'PMS likely tomorrow';
  if (until <= 7) return `${until} days to PMS`;
  return `About ${until} days to PMS`;
}
