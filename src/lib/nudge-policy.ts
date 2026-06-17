// Phase B3/B4 — nudge policy.
//
// Detection (B2) answers "is she stressed right now". This answers the separate
// question "should we actually interrupt her". Background HR delivery (B3) runs
// the detection tick often, so without a throttle a stressful stretch would fire
// a notification every few minutes. The policy keeps nudges gentle and well
// spaced: only when stressed, never during quiet (sleep) hours, never within a
// cooldown of the last nudge, and capped per day. The nudge itself (B4) carries
// the Yes/No/Not now answer that is our ground truth.
//
// Pure and time-injected so it is fully unit-testable. Thresholds are starting
// defaults, tuned against real taps in Phase E.

import type { StressVerdict } from '@/lib/stress-detect';

export type NudgePolicy = {
  /** Minimum gap between nudges. Default 90 min. */
  cooldownMs: number;
  /** Local hour the quiet period starts (inclusive). Default 22. */
  quietStartHour: number;
  /** Local hour the quiet period ends (exclusive). Default 7. */
  quietEndHour: number;
  /** Max nudges in a local day. Default 4. */
  maxPerDay: number;
};

export const DEFAULT_NUDGE_POLICY: NudgePolicy = {
  cooldownMs: 90 * 60_000,
  quietStartHour: 22,
  quietEndHour: 7,
  maxPerDay: 4,
};

export type NudgeContext = {
  now: Date;
  /** When we last fired a nudge, or null if never. */
  lastNudgeAt: Date | null;
  /** Nudges already fired in the current local day. */
  nudgesToday: number;
};

export type NudgeReason =
  | 'nudge'
  | 'not-stressed'
  | 'quiet-hours'
  | 'cooldown'
  | 'daily-cap';

export type NudgeDecision = {
  nudge: boolean;
  reason: NudgeReason;
};

/** True when `hour` is inside the (possibly midnight-wrapping) quiet window. */
export function inQuietHours(hour: number, startHour: number, endHour: number): boolean {
  const h = ((hour % 24) + 24) % 24;
  // Non-wrapping window (e.g. 1..5): inside when start <= h < end.
  if (startHour <= endHour) return h >= startHour && h < endHour;
  // Wrapping window (e.g. 22..7): inside when h >= start OR h < end.
  return h >= startHour || h < endHour;
}

/**
 * Decide whether to nudge now. Checks run in priority order, so the returned
 * reason names the first gate that stopped a nudge (or 'nudge' when all pass).
 */
export function decideNudge(
  verdict: StressVerdict,
  ctx: NudgeContext,
  policy: Partial<NudgePolicy> = {},
): NudgeDecision {
  const cfg = { ...DEFAULT_NUDGE_POLICY, ...policy };

  if (!verdict.stressed) {
    return { nudge: false, reason: 'not-stressed' };
  }
  if (inQuietHours(ctx.now.getHours(), cfg.quietStartHour, cfg.quietEndHour)) {
    return { nudge: false, reason: 'quiet-hours' };
  }
  if (
    ctx.lastNudgeAt !== null &&
    ctx.now.getTime() - ctx.lastNudgeAt.getTime() < cfg.cooldownMs
  ) {
    return { nudge: false, reason: 'cooldown' };
  }
  if (ctx.nudgesToday >= cfg.maxPerDay) {
    return { nudge: false, reason: 'daily-cap' };
  }
  return { nudge: true, reason: 'nudge' };
}
