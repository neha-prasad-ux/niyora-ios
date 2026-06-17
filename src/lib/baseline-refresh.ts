// Phase E — keep the resting baseline fresh.
//
// Resting HR drifts (fitness, sleep, illness, the cycle), so a frozen baseline
// slowly goes wrong and the detector mis-reads. This recomputes the
// activity-aware baseline from a trailing window when the stored one is missing
// or stale. Called on app launch (and foreground) ahead of the tick. Cheap when
// the baseline is fresh (a read + a date compare); only rebuilds on the cadence.
//
// I/O injected so the orchestration is testable; live wiring is in
// stress-tick-live.ts.

import {
  computeRestingBaseline,
  type ActivityBucket,
  type HrSample,
  type WorkoutSpan,
} from '@/lib/hr-baseline';
import {
  isBaselineStale,
  readBaseline,
  saveBaseline,
  type StoredBaseline,
} from '@/store/hr-baseline';
import type { BaselineModel } from '@/lib/hr-baseline';

const WINDOW_DAYS = 14;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // rebuild at most once a day

export type BaselineRefreshDeps = {
  now?: Date;
  maxAgeMs?: number;
  windowDays?: number;
  readStored?: () => Promise<StoredBaseline | null>;
  getHr: (sinceIso: string) => Promise<HrSample[]>;
  getActivityBuckets: (sinceIso: string, intervalMinutes: number) => Promise<ActivityBucket[]>;
  getWorkouts: (sinceIso: string) => Promise<WorkoutSpan[]>;
  save?: (model: BaselineModel, now: Date) => Promise<unknown>;
};

export type BaselineRefreshResult = {
  refreshed: boolean;
  /** Resting samples in the new model when refreshed. */
  samples?: number;
};

export async function refreshBaselineIfStale(
  deps: BaselineRefreshDeps,
): Promise<BaselineRefreshResult> {
  const now = deps.now ?? new Date();
  const maxAgeMs = deps.maxAgeMs ?? MAX_AGE_MS;
  const windowDays = deps.windowDays ?? WINDOW_DAYS;
  const readStored = deps.readStored ?? readBaseline;
  const save = deps.save ?? saveBaseline;

  const stored = await readStored();
  if (!isBaselineStale(stored, now, maxAgeMs)) {
    return { refreshed: false };
  }

  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const [hr, buckets, workouts] = await Promise.all([
    deps.getHr(since),
    deps.getActivityBuckets(since, 5),
    deps.getWorkouts(since),
  ]);

  const model = computeRestingBaseline(hr, buckets, workouts);
  // No usable data (e.g. watch wasn't worn) — keep whatever we had rather than
  // overwrite a good baseline with an empty one.
  if (model.sampleCount === 0) {
    return { refreshed: false };
  }

  await save(model, now);
  return { refreshed: true, samples: model.sampleCount };
}
