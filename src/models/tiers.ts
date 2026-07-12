// My Soul ring progression — chapter one of the moon reward system
// (moon-reward-spec.md). The Saturn-band visuals (ring counts, hues, the
// celebration) are unchanged from the original tiers; the logic underneath is
// rewritten onto the moon's own currency: thresholds are LIFETIME LIGHT from
// the light ledger, not session counts, so training and noticing advance the
// band too. Rings are permanent, are never lost, and gate nothing — every
// technique is always available. The home orb stays calm-blue regardless of
// tier per DESIGN.md.

import { RINGS } from '@/lib/moon-light';

export type TierId = 'base' | 'spark' | 'glow' | 'shine' | 'radiance';

export type Tier = {
  id: TierId;
  name: string;
  /** Lifetime light needed to earn this ring (see lib/moon-light RINGS). */
  threshold: number;
  /** HSL hue used to tint My Soul accents */
  hue: number;
};

// The orb starts bare (the 'base' tier has no name and no ring) and earns its
// first ring — Spark — with day one's first act, so a new user always has
// something to be excited about right away. The climb then stretches out
// (~day 3 / ~week one / ~week two at a typical ~50 light/day), and Radiance
// (600) sits just under the moon's gold gate (800) so the handoff to the
// material ladder has no dead zone. Ring colours stay distinct as the Soul
// grows: teal, pink, purple, violet.
export const TIERS: readonly Tier[] = [
  { id: 'base', name: '', threshold: 0, hue: 180 },
  { id: 'spark', name: 'Spark', threshold: RINGS[0].light, hue: 180 },
  { id: 'glow', name: 'Glow', threshold: RINGS[1].light, hue: 335 },
  { id: 'shine', name: 'Shine', threshold: RINGS[2].light, hue: 280 },
  { id: 'radiance', name: 'Radiance', threshold: RINGS[3].light, hue: 230 },
];

export function currentTier(lifetimeLight: number): Tier {
  let current = TIERS[0];
  for (const t of TIERS) {
    if (lifetimeLight >= t.threshold) current = t;
  }
  return current;
}

export function nextTier(current: Tier): Tier | null {
  const idx = TIERS.findIndex((t) => t.id === current.id);
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

export function lightToNext(lifetimeLight: number): number {
  const next = nextTier(currentTier(lifetimeLight));
  return next ? Math.max(0, next.threshold - lifetimeLight) : 0;
}

// Saturn-style ring count per tier. The ring count equals the tier's index, so
// the band widens one ring per tier crossed: base=0 (bare orb), spark=1,
// glow=2, shine=3, radiance=4.
export const TIER_RING_COUNTS: Record<TierId, number> = {
  base: 0,
  spark: 1,
  glow: 2,
  shine: 3,
  radiance: 4,
};

// Per-ring hues (one per ring-bearing tier, i.e. every tier above 'base') so an
// accumulating band keeps each tier's own colour: amber (Spark), then + pink
// (Glow), + purple (Shine), + violet (Radiance).
export const SOUL_RING_HUES: readonly number[] = TIERS.slice(1).map((t) => t.hue);

// The moon's BODY colour evolves one step per ring tier (auto — the evolution
// is the reward). A cool-blue-to-jewel arc: calm blue, then light blue on the
// very first ring, aqua, amethyst, indigo. At the material gate (800+ light)
// the material body takes over, so this ladder governs the pre-graduation moon.
// Rides the same lifetime-light thresholds as the rings — no separate score.
// (Rose intentionally skipped.) This deliberately overrides DESIGN.md's
// "home orb stays calm-blue"; the moon now grows in colour.
export const TIER_BODY_HUE: Record<TierId, number> = {
  base: 220, // calm blue
  spark: 202, // light blue
  glow: 178, // aqua / teal
  shine: 272, // amethyst
  radiance: 250, // indigo violet
};

/** The moon's body hue for a given lifetime light (see TIER_BODY_HUE). */
export function bodyHue(lifetimeLight: number): number {
  return TIER_BODY_HUE[currentTier(lifetimeLight).id];
}

export function tierRingCount(tierId: TierId): number {
  return TIER_RING_COUNTS[tierId] ?? 0;
}

// The new ring reached when lifetime light grows from `prev` to `next`, or
// null if no threshold was crossed. Used to fire the "you earned a ring"
// celebration exactly once, on the act that crosses a threshold.
export function earnedTierBetween(prev: number, next: number): Tier | null {
  const before = currentTier(prev);
  const after = currentTier(next);
  return after.id !== before.id && after.threshold > before.threshold ? after : null;
}
