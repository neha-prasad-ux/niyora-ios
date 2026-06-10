// Shared mapping + freshness for the Mac's synced "soul state" (the day's
// situational load: calm / normal / dense / heavy). Used by My Soul (text
// label) and the home orb (hue). Keeping one source avoids the two drifting.

import type { MacSoulState } from 'niyora-sync';

// A reading older than this is treated as stale and ignored, so an afternoon
// "heavy" never lingers as a warm orb late at night.
export const SOUL_FRESHNESS_MS = 90 * 60 * 1000;

// Cool blue when calm, warming toward rose as the day gets denser. Kept low in
// saturation by the orb itself so "heavy" reads as warm, not an alarm.
export const MAC_SOUL_HUES: Record<string, number> = {
  calm: 215,
  normal: 260,
  dense: 295,
  heavy: 335,
};

export const MAC_SOUL_DISPLAY: Record<string, string> = {
  calm: 'Calm',
  normal: 'Normal',
  dense: 'Dense',
  heavy: 'Heavy',
};

/** The reading if it is recent enough to trust, otherwise null. */
export function freshSoul(state: MacSoulState | null): MacSoulState | null {
  if (!state || !state.ts) return null;
  const age = Date.now() - new Date(state.ts).getTime();
  return age < SOUL_FRESHNESS_MS ? state : null;
}

/** Hue for a fresh reading, or null when there is no usable reading. */
export function macSoulHue(state: MacSoulState | null): number | null {
  const fresh = freshSoul(state);
  if (!fresh) return null;
  return MAC_SOUL_HUES[fresh.label] ?? null;
}
