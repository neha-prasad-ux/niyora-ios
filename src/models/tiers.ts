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
