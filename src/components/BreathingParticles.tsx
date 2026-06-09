/**
 * BreathingParticles (Skia)
 *
 * A GPU-rendered particle field that mirrors the Mac BreathingSession canvas.
 *
 * The previous implementation rendered 120 native <Animated.View>s (a core + an
 * aura per particle), each with a live OS shadow and per-frame width/height
 * changes. On a phone that meant 120 shadow recomputes + 120 relayouts every
 * frame, fighting a 50ms React state treadmill for the same thread — the
 * "glitch". The Mac is smooth because it draws everything into ONE canvas per
 * frame with zero React work.
 *
 * This version matches the Mac's model: one Skia <Canvas> drawing all particles
 * in a single <Atlas> call on the render thread. Each particle is one sprite —
 * a soft radial "glow dot" baked once (src/components/.. via useTexture) — drawn
 * with a per-particle transform (position + size) and per-particle colour
 * (phase hue + its own opacity). No views, no shadows, no relayout.
 *
 * Physics are unchanged: the same spring-damped integrator in src/lib/motions.ts
 * runs on the UI thread via useFrameCallback and writes the particle array into a
 * shared value; the Skia transform/colour buffers read straight from it.
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {
  Atlas,
  Canvas,
  Circle,
  Group,
  RadialGradient,
  rect,
  useColorBuffer,
  useRSXformBuffer,
  useTexture,
  vec,
} from '@shopify/react-native-skia';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { Particle, MotionType, PhaseType, updateParticle } from '../lib/motions';

type HSL = readonly [number, number, number];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Doubled from 60: a denser field reads as "stars / many points of light"
// rather than a sparse handful of blobs (the Mac "oneness" feel).
const N_PARTICLES = 120;

// The glow sprite is baked at this pixel size, then scaled per particle. Bigger
// = softer/crisper haloes when scaled down; 96 is a good quality/perf balance.
const SPRITE = 96;
const SPRITE_HALF = SPRITE / 2;

// A particle of logical `size` is drawn as a glow this many times wider, so the
// soft halo extends well past the bright core (mirrors the Mac aura at r*5).
const GLOW_SCALE = 4.2;

// Global brightness knob applied to every particle's alpha. >1 lifts the whole
// field so individual points read as bright stars against the dark gradient
// rather than dim smudges. Tune this live to taste.
const BRIGHTNESS = 1.35;

// ---------------------------------------------------------------------------
// Colour helper (worklet) — HSL(0-360, 0-100, 0-100) → RGB(0-1)
// ---------------------------------------------------------------------------

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  'worklet';
  const ss = s / 100;
  const ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) {
    r = c;
    g = x;
  } else if (hp < 2) {
    r = x;
    g = c;
  } else if (hp < 3) {
    g = c;
    b = x;
  } else if (hp < 4) {
    g = x;
    b = c;
  } else if (hp < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const m = ll - c / 2;
  return [r + m, g + m, b + m];
}

// ---------------------------------------------------------------------------
// Particle initialisation (JS thread — Math.random() not in worklets)
// ---------------------------------------------------------------------------

function createInitialParticles(cx: number, cy: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < N_PARTICLES; i++) {
    // Evenly space initial angles, jittered slightly so they don't look mechanical
    const angle = (i / N_PARTICLES) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    // Spread across most of the screen so the field fills it from the start.
    // sqrt keeps the distribution roughly uniform by area rather than centre-heavy.
    const t = Math.sqrt(Math.random());
    const x = cx + Math.cos(angle) * t * cx * 0.92;
    const y = cy + Math.sin(angle) * t * cy * 0.92;
    // Less than half the old 6–14px: small points of light, not blobs.
    const base = 2.5 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      homeY: y,
      homeAngle: angle,
      homeR: t,
      baseSize: base,
      size: base,
      opacity: 0.5 + Math.random() * 0.4,
      hue: 260 + Math.random() * 40, // violet, matching Mac createParticle
      noiseOffsetX: Math.random() * 100,
      noiseOffsetY: Math.random() * 100,
      side: (i % 2 === 0 ? -1 : 1) as -1 | 1,
    });
  }
  return particles;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BreathingParticlesProps {
  /** Which motion variant to use (maps 1-to-1 with technique.visual.motion) */
  motion: MotionType;
  /** Current breath phase */
  phase: PhaseType;
  /** Progress within the current phase, 0..1 */
  phaseT: number;
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
  active?: boolean;
  /**
   * Current phase colour [h,s,l] (the same triple driving the background
   * gradient). Particles lerp toward it so their colour shifts with the phase.
   */
  phaseColor?: HSL;
  style?: StyleProp<ViewStyle>;
}

// Fallback particle colour when no phase colour is supplied.
const DEFAULT_PHASE_COLOR: HSL = [260, 30, 12];

// ---------------------------------------------------------------------------
// BreathingParticles
// ---------------------------------------------------------------------------

export const BreathingParticles = memo(function BreathingParticles({
  motion,
  phase,
  phaseT,
  roundProgress = 0,
  active = true,
  phaseColor = DEFAULT_PHASE_COLOR,
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
  const cxSV = useSharedValue(0);
  const cySV = useSharedValue(0);
  const motionSV = useSharedValue<MotionType>(motion);
  const phaseSV = useSharedValue<PhaseType>(phase);
  const phaseTSV = useSharedValue(phaseT);
  const roundProgressSV = useSharedValue(roundProgress);

  // Current (lerped) particle colour and the phase target it eases toward.
  const phaseColorSV = useSharedValue<HSL>(phaseColor);
  const targetColorSV = useSharedValue<HSL>(phaseColor);

  // Keep shared values in sync with props (JS thread → shared memory)
  useEffect(() => {
    motionSV.value = motion;
  }, [motion]);
  useEffect(() => {
    phaseSV.value = phase;
  }, [phase]);
  useEffect(() => {
    phaseTSV.value = phaseT;
  }, [phaseT]);
  useEffect(() => {
    roundProgressSV.value = roundProgress;
  }, [roundProgress]);
  useEffect(() => {
    targetColorSV.value = phaseColor;
  }, [phaseColor]);

  // Initialise (or re-initialise after rotation) when layout is known
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width === 0 || height === 0) return;

    const cx = width / 2;
    const cy = height / 2;
    cxSV.value = cx;
    cySV.value = cy;

    allParticles.value = createInitialParticles(cx, cy);
    setHasLayout(true);
  }, []);

  // 60fps physics loop on the UI thread. Writes the particle array each frame;
  // the Skia buffers below read straight from it.
  const frameCallback = useFrameCallback((frameInfo) => {
    'worklet';
    const current = allParticles.value;
    if (current.length === 0) return;

    // Clamp dt to 50ms so a long GC pause doesn't teleport particles
    const dt = Math.min((frameInfo.timeSincePreviousFrame ?? 16.67) / 1000, 0.05);
    const t = frameInfo.timestamp / 1000;

    // Ease the particle colour toward the current phase colour (shortest-arc
    // hue) so the field and gradient shift together rather than snapping.
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

    const cx = cxSV.value;
    const cy = cySV.value;
    const mot = motionSV.value;
    const phaseType = phaseSV.value;
    const phT = phaseTSV.value;
    const roundProg = roundProgressSV.value;

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

  // ---- Skia render layer -------------------------------------------------

  // Bake the glow sprite once: a soft outer halo + a bright tight core, all in
  // white so the per-particle colour (below) can tint it via Modulate. This is
  // the Mac's "outer-glow aura + radial sphere with highlight", as one texture.
  const sprite = useTexture(
    <Group>
      <Circle cx={SPRITE_HALF} cy={SPRITE_HALF} r={SPRITE_HALF}>
        <RadialGradient
          c={vec(SPRITE_HALF, SPRITE_HALF)}
          r={SPRITE_HALF}
          colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
          positions={[0, 0.45, 1]}
        />
      </Circle>
      <Circle cx={SPRITE_HALF} cy={SPRITE_HALF} r={SPRITE_HALF * 0.42}>
        <RadialGradient
          // Offset the highlight up-left so the dot reads as a lit sphere, not
          // a flat disc (mirrors the Mac sphere highlight at x - r*0.3).
          c={vec(SPRITE_HALF * 0.86, SPRITE_HALF * 0.86)}
          r={SPRITE_HALF * 0.5}
          colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
          positions={[0, 0.5, 1]}
        />
      </Circle>
    </Group>,
    { width: SPRITE, height: SPRITE },
  );

  // One sprite rect per particle (all reference the full baked texture).
  const sprites = useMemo(
    () => Array.from({ length: N_PARTICLES }, () => rect(0, 0, SPRITE, SPRITE)),
    [],
  );

  // Per-particle transform: place + scale the glow at the particle's position.
  const transforms = useRSXformBuffer(N_PARTICLES, (xform, i) => {
    'worklet';
    const ps = allParticles.value;
    if (i >= ps.length) {
      xform.set(0, 0, -SPRITE, -SPRITE); // park offscreen until initialised
      return;
    }
    const p = ps[i];
    const scale = (p.size * GLOW_SCALE) / SPRITE;
    // RSXform maps sprite (0,0); centre the SPRITE/2 anchor on the particle.
    xform.set(scale, 0, p.x - SPRITE_HALF * scale, p.y - SPRITE_HALF * scale);
  });

  // Per-particle colour: phase hue + its own jitter, at the particle's opacity.
  const colorsBuf = useColorBuffer(N_PARTICLES, (c, i) => {
    'worklet';
    const ps = allParticles.value;
    if (i >= ps.length) {
      c[0] = 0;
      c[1] = 0;
      c[2] = 0;
      c[3] = 0;
      return;
    }
    const p = ps[i];
    const pc = phaseColorSV.value;
    // Brighter + more saturated than the dim background so the dots glow
    // against it (matches the Mac per-particle colour boost).
    const jitter = (p.noiseOffsetX % 20) - 10;
    // Push saturation hard and keep lightness mid, not high. The sprite is a
    // single flat colour modulated over a soft alpha falloff (no dark saturated
    // edge like the Mac sphere), so a high-lightness colour washes to near-white
    // over the dark field. A richer, less-light colour reads as actual colour.
    const rgb = hslToRgb(pc[0] + jitter, Math.min(pc[1] + 62, 95), Math.min(pc[2] + 50, 84));
    c[0] = rgb[0];
    c[1] = rgb[1];
    c[2] = rgb[2];
    c[3] = Math.max(0, Math.min(1, p.opacity * BRIGHTNESS));
  });

  return (
    <View
      style={[styles.container, style]}
      onLayout={handleLayout}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {hasLayout && (
        <Canvas style={styles.canvas}>
          <Atlas
            image={sprite}
            sprites={sprites}
            transforms={transforms}
            colors={colorsBuf}
            colorBlendMode="modulate"
          />
        </Canvas>
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
});
