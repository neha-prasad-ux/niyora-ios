// Phase B1 — personal resting-HR baseline, time-of-day aware.
//
// Heart rate at rest drifts over the day (lower overnight/early morning, higher
// mid-afternoon), so a single resting number would mislabel a normal afternoon
// as "elevated". We bucket the user's own HR samples by local hour-of-day and,
// per bucket, take a low percentile as the resting estimate (the calm end of
// that hour's readings) plus the median for reference.
//
// This is the reference the detection rule (B2) compares against: a reading is
// "elevated" when it sits ~10–15% above the resting estimate for its hour.
// HRV is intentionally unused (the watch yields none); HR alone detected stress
// ~73–84% personalised in the probe.

/** A single HR reading. Shape matches niyora-health's HeartRateSample. */
export type HrSample = {
  bpm: number;
  /** ISO-8601 timestamp. */
  date: string;
};

/** Per-hour resting summary. */
export type HourStat = {
  /** Resting estimate: the low percentile of this hour's readings. */
  resting: number;
  /** Median of this hour's readings (reference / sanity check). */
  median: number;
  /** Number of plausible samples in this hour bucket. */
  count: number;
};

export type BaselineModel = {
  /** 24 entries (local hour 0–23); null where there is too little data. */
  byHour: (HourStat | null)[];
  /** Whole-history resting estimate, used to fill sparse hours. */
  global: HourStat | null;
  /** Total plausible samples that fed the model. */
  sampleCount: number;
};

export type BaselineOptions = {
  /** Low percentile taken as "resting" (0–1). Default 0.25. */
  restingPercentile?: number;
  /** Minimum samples for an hour bucket to be trusted. Default 20. */
  minSamplesPerHour?: number;
  /** Implausible readings are dropped. Defaults 30–220 bpm. */
  minBpm?: number;
  maxBpm?: number;
};

const DEFAULTS = {
  restingPercentile: 0.25,
  minSamplesPerHour: 20,
  minBpm: 30,
  maxBpm: 220,
};

/**
 * Percentile of a numeric array (linear interpolation between closest ranks).
 * `p` is 0–1. Returns NaN for an empty array.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const clamped = Math.min(1, Math.max(0, p));
  const rank = clamped * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

function summarize(bpms: number[], restingPercentile: number): HourStat {
  return {
    resting: percentile(bpms, restingPercentile),
    median: percentile(bpms, 0.5),
    count: bpms.length,
  };
}

/**
 * Build a time-of-day-aware resting baseline from HR samples. Pure; pass the
 * samples read from HealthKit (any time range — more days = steadier buckets).
 */
export function computeBaseline(
  samples: HrSample[],
  options: BaselineOptions = {},
): BaselineModel {
  const { restingPercentile, minSamplesPerHour, minBpm, maxBpm } = {
    ...DEFAULTS,
    ...options,
  };

  const buckets: number[][] = Array.from({ length: 24 }, () => []);
  const all: number[] = [];

  for (const s of samples) {
    if (!Number.isFinite(s.bpm) || s.bpm < minBpm || s.bpm > maxBpm) continue;
    const t = new Date(s.date);
    const hour = t.getHours(); // local hour-of-day
    if (Number.isNaN(hour)) continue;
    buckets[hour].push(s.bpm);
    all.push(s.bpm);
  }

  const byHour = buckets.map((bpms) =>
    bpms.length >= minSamplesPerHour ? summarize(bpms, restingPercentile) : null,
  );

  const global = all.length > 0 ? summarize(all, restingPercentile) : null;

  return { byHour, global, sampleCount: all.length };
}

/**
 * Resting estimate to compare a reading against, for a given local hour.
 * Falls back to the global estimate when that hour is too sparse, then null
 * when there is no data at all.
 */
export function restingForHour(model: BaselineModel, hour: number): number | null {
  const h = ((hour % 24) + 24) % 24;
  const stat = model.byHour[h] ?? model.global;
  return stat ? stat.resting : null;
}

/** Convenience: resting estimate for the local hour of `at` (default now). */
export function restingAt(model: BaselineModel, at: Date = new Date()): number | null {
  return restingForHour(model, at.getHours());
}
