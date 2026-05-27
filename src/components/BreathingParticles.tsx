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

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
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
      hue:          200 + Math.random() * 60, // blue-to-purple
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
  index:       number;
  hue:         number;           // static, set at init
  allParticles: SharedValue<Particle[]>;
}

const ParticleView = memo(function ParticleView({
  index,
  hue,
  allParticles,
}: ParticleViewProps) {
  const style = useAnimatedStyle(() => {
    const particles = allParticles.value;
    if (index >= particles.length) return { opacity: 0 };
    const p = particles[index];
    const s = p.size;
    return {
      transform: [
        { translateX: p.x - s * 0.5 },
        { translateY: p.y - s * 0.5 },
      ],
      width:        s,
      height:       s,
      borderRadius: s * 0.5,
      opacity:      Math.max(0, Math.min(1, p.opacity)),
    };
  });

  // backgroundColor is static per-particle so it lives outside the animated style
  const color = `hsl(${hue}, 70%, 65%)`;

  return (
    <Animated.View
      style={[particleBase, { backgroundColor: color }, style]}
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
  style,
}: BreathingParticlesProps) {
  const [hasLayout, setHasLayout] = useState(false);

  // All particle state lives here so the UI-thread worklet can read/write it.
  const allParticles = useSharedValue<Particle[]>([]);

  // Per-particle static hue values, read on the JS thread during render.
  const hues = useRef<number[]>([]);

  // Shared values for props that change during a session
  const cxSV            = useSharedValue(0);
  const cySV            = useSharedValue(0);
  const motionSV        = useSharedValue<MotionType>(motion);
  const phaseSV         = useSharedValue<PhaseType>(phase);
  const phaseTSV        = useSharedValue(phaseT);
  const roundProgressSV = useSharedValue(roundProgress);

  // Keep shared values in sync with props (JS thread → shared memory)
  useEffect(() => { motionSV.value = motion; },               [motion]);
  useEffect(() => { phaseSV.value  = phase; },                [phase]);
  useEffect(() => { phaseTSV.value = phaseT; },               [phaseT]);
  useEffect(() => { roundProgressSV.value = roundProgress; }, [roundProgress]);

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
    hues.current = particles.map((p) => p.hue);

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

  // Pause/resume on prop change
  useEffect(() => {
    frameCallback.setActive(active);
  }, [active]);

  // Pause when app goes to background; resume on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      frameCallback.setActive(nextState === 'active' && active);
    });
    return () => sub.remove();
  }, [active]);

  // Stop cleanly on unmount
  useEffect(() => {
    return () => {
      frameCallback.setActive(false);
    };
  }, []);

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {hasLayout &&
        Array.from({ length: N_PARTICLES }, (_, i) => (
          <ParticleView
            key={i}
            index={i}
            hue={hues.current[i] ?? 220}
            allParticles={allParticles}
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
