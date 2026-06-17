// Phase B2 — the detection rule.
//
// A reading counts as (likely) stress when, for its time of day, heart rate sits
// meaningfully above the personal resting baseline (B1) AND the body is at rest
// — low steps, low active energy, no workout. The activity gate is what makes
// HR-alone usable: it removes the obvious confound (exercise also raises HR), so
// what's left is elevation-while-still, which the probe showed tracks felt
// stress ~73–84% personalised. The user's tap on the nudge (B4) is the real
// ground truth; these thresholds get tuned against it in Phase E.
//
// "Sustained ~5 min" matters: a single spike (stood up, sneezed) is not stress.
// We require HR to stay elevated across most of a trailing window, and refuse to
// judge until the window actually has enough data.

import { restingAt, type BaselineModel, type HrSample } from '@/lib/hr-baseline';

/** Activity over the gating window (sum the A2 reads before calling). */
export type ActivitySignals = {
  /** Steps summed over the gating window. */
  steps: number;
  /** Active energy (kcal) summed over the gating window. */
  activeEnergyKcal: number;
  /** True if a workout is in progress (HKWorkout with isActive). */
  hasActiveWorkout: boolean;
};

export type StressConfig = {
  /** Fraction above resting that counts as elevated. Default 0.12 (12%). */
  elevationPct: number;
  /** Trailing window that must stay elevated. Default 5 min. */
  sustainMs: number;
  /** Minimum data span required in the window before judging. Default 3 min. */
  minCoverageMs: number;
  /** Share of window samples that must be elevated. Default 0.7. */
  requiredElevatedFraction: number;
  /** Above this many steps in the window = moving, not stress. Default 50. */
  maxSteps: number;
  /** Above this much active energy (kcal) = moving, not stress. Default 15. */
  maxActiveEnergyKcal: number;
};

export const DEFAULT_STRESS_CONFIG: StressConfig = {
  elevationPct: 0.12,
  sustainMs: 5 * 60_000,
  minCoverageMs: 3 * 60_000,
  requiredElevatedFraction: 0.7,
  maxSteps: 50,
  maxActiveEnergyKcal: 15,
};

export type StressReason =
  | 'stressed'
  | 'calm'
  | 'active' // moving/exercising — gated out
  | 'no-baseline' // no resting estimate yet
  | 'insufficient-data'; // not enough recent HR to judge

export type StressVerdict = {
  stressed: boolean;
  reason: StressReason;
  /** Resting estimate for this hour, or null. */
  resting: number | null;
  /** Elevation threshold (resting * (1 + elevationPct)), or null. */
  threshold: number | null;
  /** Median bpm of the window, or null when the window is empty. */
  currentHr: number | null;
  /** Share of window samples at/above threshold, or null. */
  elevatedFraction: number | null;
  /** Span of HR data present in the window (ms). */
  coverageMs: number;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Evaluate whether recent HR + activity indicate stress.
 *
 * @param recent   HR samples (newest-first or any order); only those within the
 *                 sustain window are used.
 * @param baseline the B1 resting model.
 * @param activity steps / active energy / workout state over the gating window.
 */
export function evaluateStress(
  recent: HrSample[],
  baseline: BaselineModel,
  activity: ActivitySignals,
  now: Date = new Date(),
  config: Partial<StressConfig> = {},
): StressVerdict {
  const cfg = { ...DEFAULT_STRESS_CONFIG, ...config };
  const nowMs = now.getTime();

  // Trailing window of valid samples, with the span of data we actually have.
  const window: number[] = [];
  let earliestMs = nowMs;
  for (const s of recent) {
    const t = new Date(s.date).getTime();
    if (Number.isNaN(t)) continue;
    if (t < nowMs - cfg.sustainMs || t > nowMs) continue;
    if (!Number.isFinite(s.bpm)) continue;
    window.push(s.bpm);
    if (t < earliestMs) earliestMs = t;
  }
  const coverageMs = window.length > 0 ? nowMs - earliestMs : 0;
  const currentHr = median(window);

  const base = {
    resting: null as number | null,
    threshold: null as number | null,
    currentHr,
    elevatedFraction: null as number | null,
    coverageMs,
  };

  // Activity gate first: movement/exercise is decisively not the stress we want,
  // regardless of HR or whether a baseline exists yet.
  if (
    activity.hasActiveWorkout ||
    activity.steps > cfg.maxSteps ||
    activity.activeEnergyKcal > cfg.maxActiveEnergyKcal
  ) {
    return { ...base, stressed: false, reason: 'active' };
  }

  const resting = restingAt(baseline, now);
  if (resting === null) {
    return { ...base, stressed: false, reason: 'no-baseline' };
  }

  if (window.length === 0 || coverageMs < cfg.minCoverageMs) {
    return { ...base, resting, stressed: false, reason: 'insufficient-data' };
  }

  const threshold = resting * (1 + cfg.elevationPct);
  const elevatedFraction = window.filter((bpm) => bpm >= threshold).length / window.length;
  const stressed = elevatedFraction >= cfg.requiredElevatedFraction;

  return {
    stressed,
    reason: stressed ? 'stressed' : 'calm',
    resting,
    threshold,
    currentHr,
    elevatedFraction,
    coverageMs,
  };
}
