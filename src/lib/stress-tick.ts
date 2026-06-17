// Phase B3 — the stress tick.
//
// One pass of the whole loop: read recent HR + activity, compare against the
// resting baseline (B1), decide stressed-or-not (B2), throttle through the nudge
// policy (B3 policy), and, when it clears, fire the "Feeling tense?" nudge (B4)
// and record it. This is what the background HR-delivery trigger (B3 native,
// next) will call when iOS wakes the app — and what a foreground check calls
// while the app is open.
//
// All I/O is injected so the orchestration is pure and unit-testable; the live
// wiring (HealthKit reads, stores, notification) lives in `liveStressTick`.

import { restingAt, type BaselineModel, type HrSample } from '@/lib/hr-baseline';
import {
  evaluateStress,
  type ActivitySignals,
  type StressConfig,
  type StressVerdict,
  DEFAULT_STRESS_CONFIG,
} from '@/lib/stress-detect';
import {
  decideNudge,
  type NudgePolicy,
  type NudgeDecision,
} from '@/lib/nudge-policy';
import {
  latestNudgeAt,
  nudgesToday,
  type NudgeEvent,
} from '@/store/nudge-history';

export type TickDeps = {
  /** Defaults to new Date(). Injected for tests. */
  now?: Date;
  /** Recent HR samples (the tick asks for the sustain window). */
  getRecentHr: (sinceIso: string) => Promise<HrSample[]>;
  getSteps: (sinceIso: string) => Promise<number>;
  getActiveEnergy: (sinceIso: string) => Promise<number>;
  getWorkouts: (sinceIso: string) => Promise<{ isActive: boolean }[]>;
  /** The persisted resting baseline, or null if none built yet. */
  loadBaseline: () => Promise<BaselineModel | null>;
  getHistory: () => Promise<NudgeEvent[]>;
  recordFired: (e: {
    firedAt: string;
    currentHr: number | null;
    resting: number | null;
  }) => Promise<unknown>;
  fireNudge: () => Promise<unknown>;
  stressConfig?: Partial<StressConfig>;
  policy?: Partial<NudgePolicy>;
};

export type TickResult = {
  verdict: StressVerdict;
  decision: NudgeDecision;
  /** True when a nudge was fired this tick. */
  fired: boolean;
};

// Activity-gating window (matches B2). Steps/energy are summed over it.
const ACTIVITY_WINDOW_MS = 10 * 60_000;

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Run one detection→policy→nudge pass. Never throws on a "nothing to do"
 * outcome — when there's no baseline yet, or it's calm, or the policy holds the
 * nudge, it simply returns `fired: false` with the reasons in the result.
 */
export async function runStressTick(deps: TickDeps): Promise<TickResult> {
  const now = deps.now ?? new Date();
  const nowMs = now.getTime();
  const stressCfg = { ...DEFAULT_STRESS_CONFIG, ...deps.stressConfig };

  const baseline = await deps.loadBaseline();

  // With no baseline we can't judge; report it without reading sensors.
  if (!baseline) {
    const verdict: StressVerdict = {
      stressed: false,
      reason: 'no-baseline',
      resting: null,
      threshold: null,
      currentHr: null,
      elevatedFraction: null,
      coverageMs: 0,
    };
    return { verdict, decision: decideNudge(verdict, baselineCtx(now), deps.policy), fired: false };
  }

  const hrSince = iso(nowMs - stressCfg.sustainMs);
  const activitySince = iso(nowMs - ACTIVITY_WINDOW_MS);
  const [recent, steps, energy, workouts] = await Promise.all([
    deps.getRecentHr(hrSince),
    deps.getSteps(activitySince),
    deps.getActiveEnergy(activitySince),
    deps.getWorkouts(activitySince),
  ]);

  const activity: ActivitySignals = {
    steps,
    activeEnergyKcal: energy,
    hasActiveWorkout: workouts.some((w) => w.isActive),
  };

  const verdict = evaluateStress(recent, baseline, activity, now, deps.stressConfig);

  const history = await deps.getHistory();
  const decision = decideNudge(
    verdict,
    {
      now,
      lastNudgeAt: latestNudgeAt(history),
      nudgesToday: nudgesToday(history, now),
    },
    deps.policy,
  );

  if (!decision.nudge) {
    return { verdict, decision, fired: false };
  }

  await deps.recordFired({
    firedAt: now.toISOString(),
    currentHr: verdict.currentHr,
    resting: verdict.resting,
  });
  await deps.fireNudge();
  return { verdict, decision, fired: true };
}

// Context for the no-baseline short-circuit (history is irrelevant there since
// decideNudge stops at 'not-stressed' first, but keep it well-formed).
function baselineCtx(now: Date) {
  return { now, lastNudgeAt: null, nudgesToday: 0 };
}
