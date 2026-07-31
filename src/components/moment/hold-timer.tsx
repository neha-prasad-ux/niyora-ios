// The countdown for the hold, as a moon ball.
//
// The number is derived from a START TIMESTAMP, never from counting ticks. The
// whole point of the hold is that she puts the phone down and goes to do the
// thing, which on iOS suspends the JS runtime and stops any interval. A tick
// counter would freeze while she is away and lie to her when she comes back. A
// clock does not: `remaining = duration - (now - startedAt)` is correct whether
// or not the app was awake for the minutes in between, so she returns to the
// real number.
//
// The visual is her own moon, grown big and breathing a slow, subtle 4:6 while
// the minutes run — the same ball as the guided breath, at rest. The time sits
// under it. It does not survive leaving the screen entirely (that is the resume
// module's job, still bound to the old flow); backgrounding is handled.

import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';

import { Orb } from '@/components/orb';
import type { MoonMaterial } from '@/lib/moon-light';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { spacing } from '@/theme/spacing';
import { v3 } from '@/v3/v3-theme';

// A calm, gentle breath while she waits — not the wide guided-breath swell.
const WAIT_IN = 4;
const WAIT_OUT = 6;

function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function HoldTimer({
  durationMs,
  onComplete,
  hue,
  material,
  brightness,
}: {
  durationMs: number;
  onComplete: () => void;
  hue: number;
  material: MoonMaterial;
  brightness: number;
}) {
  const reduceMotion = useReducedMotion();

  // Fixed once, on first mount. Captured inside the effect rather than during
  // render: Date.now() is impure and calling it in the render body is a purity
  // violation. useRef so it survives re-renders and effect re-runs; the `??`
  // guard keeps it to a single capture even if the effect re-runs.
  const startedAt = useRef<number | null>(null);
  const fired = useRef(false);
  const [remaining, setRemaining] = useState(durationMs);
  // The moon's slow wait-breath, in/out on a 4:6.
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');

  useEffect(() => {
    startedAt.current ??= Date.now();
    const start = startedAt.current;
    const tick = () => {
      const left = durationMs - (Date.now() - start);
      setRemaining(left);
      if (left <= 0 && !fired.current) {
        fired.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onComplete();
      }
    };
    tick();
    // Half-second cadence so mm:ss never visibly stalls a beat behind the clock.
    const id = setInterval(tick, 500);
    // On return from background the interval has not been firing; recompute at
    // once rather than waiting up to half a second for the next tick.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [durationMs, onComplete]);

  // Drive the slow wait-breath, unless motion is reduced.
  useEffect(() => {
    if (reduceMotion) return;
    const secs = phase === 'inhale' ? WAIT_IN : WAIT_OUT;
    const id = setTimeout(() => setPhase((p) => (p === 'inhale' ? 'exhale' : 'inhale')), secs * 1000);
    return () => clearTimeout(id);
  }, [phase, reduceMotion]);

  const elapsed = durationMs - remaining;
  const pct = Math.min(1, Math.max(0, elapsed / durationMs));

  return (
    <View style={styles.wrap}>
      {/* The Orb's box is 1.8x its sphere, so most of it is transparent halo.
          A negative margin absorbs that halo top and bottom, pulling the visible
          ball tight to the guard above and the clock below. */}
      <View style={styles.ballBox} pointerEvents="none">
        <Orb
          size={168}
          tierRingCount={0}
          phase={reduceMotion ? undefined : phase}
          phaseDuration={phase === 'inhale' ? WAIT_IN : WAIT_OUT}
          breathRange={{ min: 0.94, max: 1.06 }}
          still={reduceMotion}
          hue={hue}
          brightness={brightness}
          material={material}
          illum={1}
        />
      </View>
      <Text style={styles.clock}>{mmss(remaining)}</Text>
      <View style={styles.track} accessibilityRole="progressbar">
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xs },
  // Eats ~40px of the Orb's transparent halo on each side, so the ball reads
  // close to what is above and below it instead of floating in dead space.
  ballBox: { marginVertical: -40 },
  clock: {
    fontFamily: fonts.light,
    fontSize: 56,
    lineHeight: 64,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  track: {
    width: '70%',
    height: 4,
    borderRadius: 2,
    backgroundColor: v3.panelBorder,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2, backgroundColor: v3.accent },
});
