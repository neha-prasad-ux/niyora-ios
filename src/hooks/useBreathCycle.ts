/**
 * useBreathCycle
 *
 * Drives the breath-phase timer and interpolates the background HSL colour
 * values that particles use for their hue source. The bgHue / bgSat / bgLit
 * values are Reanimated SharedValues so BreathingParticles can read them on
 * the UI thread without a bridge round-trip.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Easing,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { BreathPhase, BreathTechnique, PhaseName } from '@/models/techniques';

export interface BreathCycleOutput {
  /** Current breath phase name, updated each time the phase advances. */
  phaseName: PhaseName;
  /** Animated hue (0-360). Lerps to the next phase's hue value. */
  bgHue: SharedValue<number>;
  /** Animated saturation (0-100). */
  bgSat: SharedValue<number>;
  /** Animated lightness (0-100). */
  bgLit: SharedValue<number>;
  /**
   * Brightness boost fraction from the technique's visual config.
   * Not animated between phases; just reflects technique.visual.brightnessBoost.
   */
  brightnessBoost: SharedValue<number>;
}

/**
 * Drives a looping breath cycle for the given technique.
 *
 * The returned SharedValues are stable references — they never change identity
 * across re-renders, only their `.value` is mutated by animations.
 */
export function useBreathCycle(technique: BreathTechnique): BreathCycleOutput {
  const firstPhase = technique.phases[0];

  const bgHue = useSharedValue(firstPhase.hue);
  const bgSat = useSharedValue(firstPhase.saturation);
  const bgLit = useSharedValue(firstPhase.lightness);
  const brightnessBoost = useSharedValue(technique.visual.brightnessBoost);

  const [phaseIndex, setPhaseIndex] = useState(0);
  // Track phaseIndex in a ref so the timer callback always sees the latest value.
  const phaseIndexRef = useRef(phaseIndex);
  phaseIndexRef.current = phaseIndex;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Update boost when technique changes.
    brightnessBoost.value = technique.visual.brightnessBoost;

    function tick() {
      const current = technique.phases[phaseIndexRef.current];
      const nextIndex = (phaseIndexRef.current + 1) % technique.phases.length;
      const next: BreathPhase = technique.phases[nextIndex];

      // Crossfade lasts the first half of the current phase, capped at 1.5 s.
      const crossfadeMs = Math.min(current.duration * 500, 1500);
      const easing = Easing.inOut(Easing.quad);

      bgHue.value = withTiming(next.hue, { duration: crossfadeMs, easing });
      bgSat.value = withTiming(next.saturation, { duration: crossfadeMs, easing });
      bgLit.value = withTiming(next.lightness, { duration: crossfadeMs, easing });

      setPhaseIndex(nextIndex);
      timerRef.current = setTimeout(tick, current.duration * 1000);
    }

    // Kick off after the first phase's full duration.
    timerRef.current = setTimeout(tick, firstPhase.duration * 1000);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
    // Re-run only when the technique changes (not on every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technique]);

  const currentPhase = technique.phases[phaseIndex];

  return {
    phaseName: currentPhase.name,
    bgHue,
    bgSat,
    bgLit,
    brightnessBoost,
  };
}
