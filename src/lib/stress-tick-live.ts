// Live wiring for the stress tick: supplies the real HealthKit reads, baseline
// store, nudge history, and notification. Kept separate from stress-tick.ts so
// the orchestration stays pure/testable. This is what the foreground check and
// the background-delivery trigger (B3 native) call.

import { NiyoraHealth } from 'niyora-health';
import { runStressTick, type TickDeps, type TickResult } from '@/lib/stress-tick';
import { readBaseline } from '@/store/hr-baseline';
import { getNudgeHistory, recordNudgeFired } from '@/store/nudge-history';
import { fireStressNudge } from '@/lib/stress-nudge';
import {
  refreshBaselineIfStale,
  type BaselineRefreshResult,
} from '@/lib/baseline-refresh';

export async function liveStressTick(
  overrides: Partial<TickDeps> = {},
): Promise<TickResult> {
  return runStressTick({
    getRecentHr: (since) => NiyoraHealth.getHeartRateSamples(since, 1000),
    getSteps: (since) => NiyoraHealth.getStepCount(since),
    getActiveEnergy: (since) => NiyoraHealth.getActiveEnergy(since),
    getWorkouts: (since) => NiyoraHealth.getRecentWorkouts(since),
    loadBaseline: async () => (await readBaseline())?.model ?? null,
    getHistory: getNudgeHistory,
    recordFired: recordNudgeFired,
    fireNudge: fireStressNudge,
    ...overrides,
  });
}

/** Rebuild the resting baseline from the last 14 days when it's missing/stale. */
export async function liveRefreshBaselineIfStale(): Promise<BaselineRefreshResult> {
  return refreshBaselineIfStale({
    getHr: (since) => NiyoraHealth.getHeartRateSamples(since, 100000),
    getActivityBuckets: (since, min) => NiyoraHealth.getActivityBuckets(since, min),
    getWorkouts: (since) => NiyoraHealth.getRecentWorkouts(since, 200),
  });
}

/** One full live pass: keep the baseline fresh, then run the detection tick. */
export async function liveStressCheck(): Promise<{
  refresh: BaselineRefreshResult;
  tick: TickResult;
}> {
  const refresh = await liveRefreshBaselineIfStale();
  const tick = await liveStressTick();
  return { refresh, tick };
}
