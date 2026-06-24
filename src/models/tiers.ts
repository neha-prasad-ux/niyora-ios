// My Soul progression tiers. Ported from niyora/app/src/tiers.ts.
//
// Thresholds count COMPLETED sessions only. Each tier unlocks techniques.
// The tier hue is used to tint My Soul accents (level name, ring around
// the orb). The home orb stays calm-blue regardless of tier per DESIGN.md.

export type TierId = 'spark' | 'glow' | 'shine' | 'radiance' | 'brilliance';

export type Tier = {
  id: TierId;
  name: string;
  threshold: number;
  /** HSL hue used to tint My Soul accents */
  hue: number;
};

export const TIERS: readonly Tier[] = [
  { id: 'spark', name: 'Spark', threshold: 0, hue: 30 },
  { id: 'glow', name: 'Glow', threshold: 5, hue: 335 },
  { id: 'shine', name: 'Shine', threshold: 15, hue: 280 },
  { id: 'radiance', name: 'Radiance', threshold: 40, hue: 230 },
  { id: 'brilliance', name: 'Brilliance', threshold: 80, hue: 210 },
];

export function currentTier(completedSessions: number): Tier {
  let current = TIERS[0];
  for (const t of TIERS) {
    if (completedSessions >= t.threshold) current = t;
  }
  return current;
}

export function nextTier(current: Tier): Tier | null {
  const idx = TIERS.findIndex((t) => t.id === current.id);
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

export function sessionsToNext(completedSessions: number): number {
  const next = nextTier(currentTier(completedSessions));
  return next ? Math.max(0, next.threshold - completedSessions) : 0;
}

// Saturn-style ring count per tier. Matches Mac tierRingCount():
// spark=0, glow=1, shine=2, radiance=3, brilliance=4. The ring count equals
// the tier's index, so the band visibly widens one ring per tier crossed.
export const TIER_RING_COUNTS: Record<TierId, number> = {
  spark: 0,
  glow: 1,
  shine: 2,
  radiance: 3,
  brilliance: 4,
};

// Per-ring hues (one per tier above spark) so an accumulating band keeps each
// tier's own colour: pink (Glow), then + purple (Shine), then + blue, etc.
export const SOUL_RING_HUES: readonly number[] = TIERS.slice(1).map((t) => t.hue);

export function tierRingCount(tierId: TierId): number {
  return TIER_RING_COUNTS[tierId] ?? 0;
}

// The new tier reached when the session count grows from `prev` to `next`, or
// null if no tier boundary was crossed. Used to fire the "you earned a ring"
// celebration exactly once, on the session that crosses a threshold.
export function earnedTierBetween(prev: number, next: number): Tier | null {
  const before = currentTier(prev);
  const after = currentTier(next);
  return after.id !== before.id && after.threshold > before.threshold ? after : null;
}
