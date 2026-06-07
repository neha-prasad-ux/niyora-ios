/**
 * BreathingParticles
 *
 * 60-particle field that runs at 60fps via react-native-reanimated's
 * useFrameCallback (UI thread worklet).  Physics are a verbatim port of the
 * Mac BreathingSession spring-damped integrator:
 *
 *   vx = vx * 0.92 + fx * dt * 8    (friction + force-gain)
 *   speed capped at 1.8 px/frame
 *
 * Noise drift uses a smooth 2D value noise (src/lib/noise.ts) for organic
 * inter-phase motion; each particle samples a unique offset so they move
 * independently.
 *
 * All 12 motion variants from the Mac are implemented in src/lib/motions.ts
 * and selected by the `motion` prop.
 */

import { memo, useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import { Particle, MotionType, PhaseType, updateParticle } from '../lib/motions';

type HSL = readonly [number, number, number];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const N_PARTICLES = 60;

// ---------------------------------------------------------------------------
// Particle initialisation (JS thread — Math.random() not in worklets)
// ---------------------------------------------------------------------------

function createInitialParticles(cx: number, cy: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < N_PARTICLES; i++) {
    // Evenly space initial angles, jittered slightly so they don't look mechanical
    const angle = (i / N_PARTICLES) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const r     = 40 + Math.random() * 100;
    const x     = cx + Math.cos(angle) * r;
    const y     = cy + Math.sin(angle) * r;
    const base  = 4  + Math.random() * 6;
    particles.push({
      x,
      y,
      vx:           0,
      vy:           0,
      homeY:        y,
      baseSize:     base,
      size:         base,
      opacity:      0.3 + Math.random() * 0.35,
      hue:          260 + Math.random() * 40, // violet, matching Mac createParticle
      noiseOffsetX: Math.random() * 100,
      noiseOffsetY: Math.random() * 100,
      side:         (i % 2 === 0 ? -1 : 1) as (-1 | 1),
    });
  }
  return particles;
}

// ---------------------------------------------------------------------------
// ParticleView — one Animated.View per particle
//
// Defined as a sibling (not inside BreathingParticles) so that hooks are
// called at a stable scope; memoised to avoid prop-change churn.
// ---------------------------------------------------------------------------

interface ParticleViewProps {
  index:        number;
  allParticles: SharedValue<Particle[]>;
  /** Live phase colour [h,s,l], lerped on the UI thread. */
  phaseColor:   SharedValue<HSL>;
}

const ParticleView = memo(function ParticleView({
  index,
  allParticles,
  phaseColor,
}: ParticleViewProps) {
  // Animated wrapper carries position + size + opacity + colour. The native
  // shadow on the wrapper provides the soft outer halo.
  const wrapperStyle = useAnimatedStyle(() => {
    const particles = allParticles.value;
    if (index >= particles.length) return { opacity: 0 };
    const p = particles[index];
    const s = p.size;

    // Colour tracks the live phase/background colour, mirroring the Mac
    // (ph = bgHue + per-particle jitter, brighter + more saturated than the
    // dim background so the dots glow against it). Recomputed every frame, so
    // the field shifts hue together with the gradient.
    const c = phaseColor.value;
    const jitter = (p.noiseOffsetX % 20) - 10;
    const ph = Math.round(c[0] + jitter);
    const ps = Math.round(Math.min(c[1] + 50, 90));
    const pl = Math.round(Math.min(c[2] + 50, 85));
    const body = `hsl(${ph}, ${ps}%, ${pl}%)`;
    const halo = `hsl(${ph}, ${ps}%, ${Math.min(pl + 6, 90)}%)`;

    return {
      transform: [
        { translateX: p.x - s * 0.5 },
        { translateY: p.y - s * 0.5 },
      ],
      width: s,
      height: s,
      borderRadius: s * 0.5,
      opacity: Math.max(0, Math.min(1, p.opacity)),
      backgroundColor: body,
      shadowColor: halo,
      shadowRadius: s * 1.6,
    };
  });

  return (
    <Animated.View
      style={[
        particleBase,
        {
          shadowOpacity: 0.55,
          shadowOffset: { width: 0, height: 0 },
        },
        wrapperStyle,
      ]}
    />
  );
});

const particleBase = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0 },
}).root;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BreathingParticlesProps {
  /** Which motion variant to use (maps 1-to-1 with technique.visual.motion) */
  motion:         MotionType;
  /** Current breath phase */
  phase:          PhaseType;
  /** Progress within the current phase, 0..1 */
  phaseT:         number;
  /**
   * Progress within the current round, 0..1.
   * Only used by the 'sedation' (Wind Down) motion to progressively calm
   * particle forces.
   */
  roundProgress?: number;
  /**
   * Set to false to pause the animation loop (e.g. when the screen is
   * not in focus).  Defaults to true.
   */
  active?:        boolean;
  /**
   * Current phase colour [h,s,l] (the same triple driving the background
   * gradient). Particles lerp toward it so their colour shifts with the phase.
   */
  phaseColor:     HSL;
  style?:         StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// BreathingParticles
// ---------------------------------------------------------------------------

export function BreathingParticles({
  motion,
  phase,
  phaseT,
  roundProgress = 0,
  active        = true,
  phaseColor,
  style,
}: BreathingParticlesProps) {
  const [hasLayout, setHasLayout] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      if (!cancelled) setReduceMotion(rm);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // All particle state lives here so the UI-thread worklet can read/write it.
  const allParticles = useSharedValue<Particle[]>([]);

  // Shared values for props that change during a session
  const cxSV            = useSharedValue(0);
  const cySV            = useSharedValue(0);
  const motionSV        = useSharedValue<MotionType>(motion);
  const phaseSV         = useSharedValue<PhaseType>(phase);
  const phaseTSV        = useSharedValue(phaseT);
  const roundProgressSV = useSharedValue(roundProgress);

  // Current (lerped) particle colour and the phase target it eases toward.
  const phaseColorSV    = useSharedValue<HSL>(phaseColor);
  const targetColorSV   = useSharedValue<HSL>(phaseColor);

  // Keep shared values in sync with props (JS thread → shared memory)
  useEffect(() => { motionSV.value = motion; },               [motion]);
  useEffect(() => { phaseSV.value  = phase; },                [phase]);
  useEffect(() => { phaseTSV.value = phaseT; },               [phaseT]);
  useEffect(() => { roundProgressSV.value = roundProgress; }, [roundProgress]);
  useEffect(() => { targetColorSV.value = phaseColor; },      [phaseColor]);

  // Initialise (or re-initialise after rotation) when layout is known
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width === 0 || height === 0) return;

    const cx = width  / 2;
    const cy = height / 2;
    cxSV.value = cx;
    cySV.value = cy;

    const particles = createInitialParticles(cx, cy);
    allParticles.value = particles;

    setHasLayout(true);
  }, []);

  // 60fps animation loop on the UI thread
  const frameCallback = useFrameCallback((frameInfo) => {
    'worklet';
    const current = allParticles.value;
    if (current.length === 0) return;

    // Clamp dt to 50ms so a long GC pause doesn't teleport particles
    const dt          = Math.min((frameInfo.timeSincePreviousFrame ?? 16.67) / 1000, 0.05);
    const t           = frameInfo.timestamp / 1000;

    // Ease the particle colour toward the current phase colour at the same rate
    // as the background gradient (dt * 1.2), with shortest-arc hue interpolation
    // so the field and gradient shift together rather than snapping.
    const cur = phaseColorSV.value;
    const tgt = targetColorSV.value;
    let dh = tgt[0] - cur[0];
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
    const ck = Math.min(dt * 1.2, 1);
    phaseColorSV.value = [
      (cur[0] + dh * ck + 360) % 360,
      cur[1] + (tgt[1] - cur[1]) * ck,
      cur[2] + (tgt[2] - cur[2]) * ck,
    ];
    const cx          = cxSV.value;
    const cy          = cySV.value;
    const mot         = motionSV.value;
    const phaseType   = phaseSV.value;
    const phT         = phaseTSV.value;
    const roundProg   = roundProgressSV.value;

    const next: Particle[] = [];
    for (let i = 0; i < current.length; i++) {
      next[i] = updateParticle(current[i], cx, cy, mot, phaseType, phT, t, dt, roundProg);
    }

    allParticles.value = next;
  }, true /* autostart */);

  // Pause/resume on prop change or reduce-motion toggle
  useEffect(() => {
    frameCallback.setActive(active && !reduceMotion);
  }, [active, reduceMotion]);

  // Pause when app goes to background; resume on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      frameCallback.setActive(nextState === 'active' && active && !reduceMotion);
    });
    return () => sub.remove();
  }, [active, reduceMotion]);

  // Stop cleanly on unmount
  useEffect(() => {
    return () => {
      frameCallback.setActive(false);
    };
  }, []);

  return (
    <View
      style={[styles.container, style]}
      onLayout={handleLayout}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {hasLayout &&
        Array.from({ length: N_PARTICLES }, (_, i) => (
          <ParticleView
            key={i}
            index={i}
            allParticles={allParticles}
            phaseColor={phaseColorSV}
          />
        ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex:     1,
    overflow: 'hidden',
  },
});
