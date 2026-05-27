/**
 * BreathingParticles
 *
 * Renders a field of luminous sphere particles on a Skia GPU canvas,
 * matching the Mac render in BreathingSession.tsx (lines 1028-1055).
 *
 * Each particle is drawn as two layered radial gradients:
 *
 *   Layer 1 – outer glow aura:
 *     RadialGradient at 5× particle radius, fading to transparent.
 *
 *   Layer 2 – sphere body:
 *     4-stop RadialGradient with the gradient centre offset top-left by
 *     r×0.3 so the dot reads as a lit sphere rather than a flat disk.
 *
 * Per-particle hue jitter (±10°) ensures the field is not monochrome.
 * Boosted saturation (+50) and lightness (+50 + brightnessBoost×100)
 * make the particles read as bright dots against a dark background.
 *
 * Physics: spring-damped convergence on the UI thread via useFrameCallback.
 * Particles spring toward their individual target positions; the spread
 * SharedValue scales those targets so the field expands/contracts with
 * the breath cycle.
 */

import type { ViewStyle } from 'react-native';
import {
  Canvas,
  Picture,
  Skia,
  TileMode,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Target offset from canvas centre, unit-normalised (scaled by spread). */
  targetDx: number;
  targetDy: number;
  /** Particle radius in points. */
  size: number;
  opacity: number;
  /** Per-particle hue jitter value in range [-20, 20]; applied as % 20 - 10. */
  noiseOffsetX: number;
}

export interface BreathingParticlesProps {
  /** Animated HSL hue (0-360) from the current breath phase colour. */
  bgHue: SharedValue<number>;
  /** Animated HSL saturation (0-100). */
  bgSat: SharedValue<number>;
  /** Animated HSL lightness (0-100). */
  bgLit: SharedValue<number>;
  /**
   * Additional brightness fraction (0-1).
   * Mirrors visual.brightnessBoost in the technique model.
   */
  brightnessBoost: SharedValue<number>;
  /**
   * How far particles spread from centre, in points.
   * Animate this from the breath cycle to drive convergence/expansion.
   */
  spread: SharedValue<number>;
  /** Number of particles. Defaults to 60. */
  particleCount?: number;
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Physics constants
// ---------------------------------------------------------------------------

const SPRING_K = 4;       // spring stiffness (s^-2)
const SPRING_DAMP = 0.88; // velocity multiplier applied each frame
const MAX_DT = 0.05;      // cap delta-time at 50 ms to prevent tunnelling

// ---------------------------------------------------------------------------
// Worklet helpers
// ---------------------------------------------------------------------------

/**
 * Convert HSL (h 0-360, s 0-100, l 0-100, a 0-1) to a packed ARGB integer
 * (0xAARRGGBB) accepted by Skia's imperative colour API.
 *
 * Algorithm: https://www.rapidtables.com/convert/color/hsl-to-rgb.html
 */
function hslToArgb(h: number, s: number, l: number, a: number): number {
  'worklet';
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const m = sn * Math.min(ln, 1 - ln);
  const f = (n: number) =>
    ln - m * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);
  const al = Math.round(a * 255);
  // Use multiplication to avoid signed-integer overflow from bitwise shifts.
  return (al * 16777216 + r * 65536 + g * 256 + b) >>> 0;
}

/** Deterministic pseudo-random float in [min, max) for a given integer seed. */
function deterministicRand(seed: number, min: number, max: number): number {
  'worklet';
  const frac = Math.abs(Math.sin(seed + 1) * 43758.5453123) % 1;
  return min + frac * (max - min);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BreathingParticles({
  bgHue,
  bgSat,
  bgLit,
  brightnessBoost,
  spread,
  particleCount = 60,
  style,
}: BreathingParticlesProps) {
  // Canvas size, written on layout, read by physics + picture on the UI thread.
  const canvasW = useSharedValue(0);
  const canvasH = useSharedValue(0);

  // All particle state in one SharedValue. Replacing the array each frame
  // ensures useDerivedValue detects the change.
  const particles = useSharedValue<ParticleState[]>([]);

  // Set to true after the first frame with valid canvas dimensions.
  const initialised = useSharedValue(false);

  // ---- Physics loop -------------------------------------------------------
  useFrameCallback((info) => {
    'worklet';
    const w = canvasW.value;
    const h = canvasH.value;
    if (w === 0 || h === 0) return;

    // One-time lazy init after layout is known.
    if (!initialised.value) {
      initialised.value = true;
      const cx = w / 2;
      const cy = h / 2;
      const initSpread = Math.min(w, h) * 0.35;
      const ps: ParticleState[] = [];
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const dist = initSpread * (0.4 + deterministicRand(i, 0, 0.6));
        ps.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          targetDx: Math.cos(angle) * deterministicRand(i + 100, 0.3, 1.0),
          targetDy: Math.sin(angle) * deterministicRand(i + 200, 0.3, 1.0),
          size: 3 + deterministicRand(i + 300, 0, 3),
          opacity: 0.4 + deterministicRand(i + 400, 0, 0.3),
          noiseOffsetX: deterministicRand(i + 500, -20, 20),
        });
      }
      particles.value = ps;
      return;
    }

    const dt = Math.min((info.timeSincePreviousFrame ?? 16) / 1000, MAX_DT);
    const cx = w / 2;
    const cy = h / 2;
    const sp = spread.value;
    const prev = particles.value;
    const next: ParticleState[] = [];

    for (let i = 0; i < prev.length; i++) {
      const p = prev[i];
      const tx = cx + p.targetDx * sp;
      const ty = cy + p.targetDy * sp;
      const ax = (tx - p.x) * SPRING_K;
      const ay = (ty - p.y) * SPRING_K;
      const vx = (p.vx + ax * dt) * SPRING_DAMP;
      const vy = (p.vy + ay * dt) * SPRING_DAMP;
      next.push({
        ...p,
        x: p.x + vx * dt,
        y: p.y + vy * dt,
        vx,
        vy,
      });
    }
    particles.value = next;
  });

  // ---- Picture derivation -------------------------------------------------
  // Recomputed on the UI thread whenever particles or colour values change.
  const picture = useDerivedValue(() => {
    'worklet';
    const w = canvasW.value;
    const h = canvasH.value;
    const recorder = Skia.PictureRecorder();
    const skCanvas = recorder.beginRecording(
      Skia.XYWHRect(0, 0, w > 0 ? w : 1, h > 0 ? h : 1),
    );

    const ps = particles.value;
    const bgH = bgHue.value;
    const bgS = bgSat.value;
    const bgL = bgLit.value;
    const boost = brightnessBoost.value;

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];

      // Per-particle hue jitter ±10°, matching Mac: h + (noiseOffsetX % 20 - 10)
      const ph = bgH + (p.noiseOffsetX % 20 - 10);
      const ps2 = Math.min(bgS + 50, 90);
      const pl = Math.min(bgL + 50 + boost * 100, 85);
      const op = Math.min(p.opacity + 0.1, 0.75);
      const r = p.size;

      // ---- Layer 1: outer glow aura at 5× radius --------------------------
      const auraR = r * 5;
      const auraShader = Skia.Shader.MakeRadialGradient(
        { x: p.x, y: p.y },
        auraR,
        [
          hslToArgb(ph, ps2, pl, op * 0.15),
          hslToArgb(ph, ps2, pl, 0),
        ],
        null,
        TileMode.Clamp,
      );
      const auraPaint = Skia.Paint();
      auraPaint.setShader(auraShader);
      auraPaint.setAntiAlias(true);
      skCanvas.drawCircle(p.x, p.y, auraR, auraPaint);

      // ---- Layer 2: sphere body with top-left highlight -------------------
      const hlX = p.x - r * 0.3;
      const hlY = p.y - r * 0.3;
      const sphereShader = Skia.Shader.MakeRadialGradient(
        { x: hlX, y: hlY },
        r,
        [
          hslToArgb(ph, Math.max(ps2 - 15, 20), Math.min(pl + 25, 95), op),
          hslToArgb(ph, ps2, pl, op),
          hslToArgb(ph, ps2 + 5, Math.max(pl - 10, 15), op),
          hslToArgb(ph, ps2 + 10, Math.max(pl - 20, 10), op * 0.6),
        ],
        [0, 0.4, 0.8, 1],
        TileMode.Clamp,
      );
      const spherePaint = Skia.Paint();
      spherePaint.setShader(sphereShader);
      spherePaint.setAntiAlias(true);
      skCanvas.drawCircle(p.x, p.y, r, spherePaint);
    }

    return recorder.finishRecordingAsPicture();
  });

  return (
    <Canvas
      style={style}
      onLayout={({ nativeEvent: { layout } }) => {
        canvasW.value = layout.width;
        canvasH.value = layout.height;
      }}
    >
      <Picture picture={picture} />
    </Canvas>
  );
}
