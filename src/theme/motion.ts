// Motion, the timing language the app was missing. The audit found animation
// durations scattered across ~30 arbitrary values (90, 120, 220, 280, 340,
// 460, 520 …) with no scale. Easing was already coherent; these names just
// pin it down. Pull durations and easings from here.
//
// Reanimated is the app's animation engine. `withTiming(x, motionTiming.base)`.
//
// Exceptions that do NOT use this scale (and shouldn't): the ambient orb pulse
// (~5.5s breath cadence) and particle loops. Those are bespoke, driven by the
// breath rhythm, and documented in DESIGN.md.

import { Easing } from 'react-native-reanimated';

// ── Durations (ms) ────────────────────────────────────────────────────────────
export const duration = {
  // Press feedback, taps, toggles. Snappy.
  fast: 150,
  // The default for most UI transitions (fades, slides, reveals).
  base: 250,
  // Larger or more deliberate moves (a card expanding, a screen element
  // settling in).
  slow: 400,
  // Calm, atmospheric one-shots that should feel unhurried.
  gentle: 600,
} as const;

// ── Easings ───────────────────────────────────────────────────────────────────
export const easing = {
  // The default. Decelerate into place · feels like settling, not stopping.
  standard: Easing.out(Easing.cubic),
  // Breath-like in/out. For anything on the inhale/exhale cadence.
  breathe: Easing.inOut(Easing.sin),
  // Gentle entrance for content appearing.
  enter: Easing.out(Easing.quad),
} as const;

// Ready-made Reanimated timing configs, so callers pass one object.
export const motionTiming = {
  fast: { duration: duration.fast, easing: easing.standard },
  base: { duration: duration.base, easing: easing.standard },
  slow: { duration: duration.slow, easing: easing.standard },
  gentle: { duration: duration.gentle, easing: easing.enter },
} as const;
