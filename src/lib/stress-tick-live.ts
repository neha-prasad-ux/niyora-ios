// Live wiring for the stress tick: supplies the real HealthKit reads, baseline
// store, nudge history, and notification. Kept separate from stress-tick.ts so
// the orchestration stays pure/testable. This is what the foreground check and
// the background-delivery trigger (B3 native) call.

import { NiyoraHealth } from 'niyora-health';
import { runStressTick, type TickDeps, type TickResult } from '@/lib/stress-tick';
import { readBaseline } from '@/store/hr-baseline';
import { getNudgeHistory, recordNudgeFired } from '@/store/nudge-history';
import { fireStressNudge } from '@/lib/stress-nudge';

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
