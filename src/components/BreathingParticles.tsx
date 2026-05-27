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
 *
 * New-arch (Fabric) notes:
 *   - Canvas.onLayout is not supported on Fabric. Canvas.onSize is the
 *     correct replacement: it receives a SharedValue<{width,height}> that
 *     Skia updates on the UI thread without a bridge round-trip.
 *     See: https://shopify.github.io/react-native-skia/docs/canvas/overview/#getting-the-canvas-size
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

/** Deterministic pseudo-random float in [min, max) for a given integer seed. */
function deterministicRand(seed: number, min: number, max: number): number {
  'worklet';
  const frac = Math.abs(Math.sin(seed + 1) * 43758.5453123) % 1;
  return min + frac * (max - min);
}

/**
 * Build an SkColor (0xAARRGGBB) from HSL + alpha.
 *
 * Delegates the HSL-to-RGB conversion to Skia.Color() (Skia's own CSS
 * colour parser) rather than a manual arithmetic path. This guarantees
 * the RGB bytes are always valid SkColor data before they reach the GPU
 * shader compiler. Alpha is then spliced into the high byte.
 *
 * All inputs are clamped so that animated values crossing phase boundaries
 * (or arriving before the initial withTiming completes) never produce NaN
 * or out-of-range values.
 */
function makeSkColor(h: number, s: number, l: number, a: number): number {
  'worklet';
  // Guard: replace any non-finite value with a safe default.
  const hc = isFinite(h) ? ((h % 360) + 360) % 360 : 0;
  const sc = isFinite(s) ? Math.max(0, Math.min(100, s)) : 0;
  const lc = isFinite(l) ? Math.max(0, Math.min(100, l)) : 0;
  const ac = isFinite(a) ? Math.max(0, Math.min(1, a)) : 0;
  // Skia.Color('hsl(...)') returns 0xFFRRGGBB (fully opaque).
  const opaque = Skia.Color(`hsl(${hc}, ${sc}%, ${lc}%)`);
  // Splice in the requested alpha byte.
  const al = Math.round(ac * 255) & 0xff;
  return ((opaque & 0x00ffffff) | (al * 0x1000000)) >>> 0;
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
  // Canvas size written by Canvas.onSize on the UI thread (new-arch safe).
  // Using a single object SharedValue matches the type Canvas.onSize expects.
  const canvasSize = useSharedValue({ width: 0, height: 0 });

  // All particle state in one SharedValue. Replacing the array each frame
  // ensures useDerivedValue detects the change.
  const particles = useSharedValue<ParticleState[]>([]);

  // Set to true after the first frame with valid canvas dimensions.
  const initialised = useSharedValue(false);

  // particleCount is a render-time constant; store in a SharedValue so the
  // useFrameCallback worklet does not capture a JS-side prop reference.
  const particleCountSV = useSharedValue(particleCount);

  // ---- Physics loop -------------------------------------------------------
  useFrameCallback((info) => {
    'worklet';
    const { width: w, height: h } = canvasSize.value;
    if (w === 0 || h === 0) return;

    // One-time lazy init after layout is known.
    if (!initialised.value) {
      initialised.value = true;
      const cx = w / 2;
      const cy = h / 2;
      const initSpread = Math.min(w, h) * 0.35;
      const count = particleCountSV.value;
      const ps: ParticleState[] = [];
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
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
    const sp = isFinite(spread.value) ? spread.value : 0;
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
    const { width: w, height: h } = canvasSize.value;

    // Guard: return an empty picture before layout or before particles seed.
    // Prevents PictureRecorder.beginRecording with zero dimensions and avoids
    // passing empty arrays into the Skia gradient shader.
    if (!w || !h) {
      const emptyRec = Skia.PictureRecorder();
      emptyRec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
      return emptyRec.finishRecordingAsPicture();
    }

    const recorder = Skia.PictureRecorder();
    const skCanvas = recorder.beginRecording(Skia.XYWHRect(0, 0, w, h));

    const ps = particles.value;
    const bgH = bgHue.value;
    const bgS = bgSat.value;
    const bgL = bgLit.value;
    const boost = isFinite(brightnessBoost.value) ? brightnessBoost.value : 0;

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];

      // Skip any particle with non-finite geometry to prevent a Skia crash.
      if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.size) || p.size <= 0) {
        continue;
      }

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
          makeSkColor(ph, ps2, pl, op * 0.15),
          makeSkColor(ph, ps2, pl, 0),
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
          makeSkColor(ph, Math.max(ps2 - 15, 20), Math.min(pl + 25, 95), op),
          makeSkColor(ph, ps2, pl, op),
          makeSkColor(ph, ps2 + 5, Math.max(pl - 10, 15), op),
          makeSkColor(ph, ps2 + 10, Math.max(pl - 20, 10), op * 0.6),
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

  // Canvas.onSize is the new-arch (Fabric) replacement for onLayout.
  // It receives a SharedValue<{width, height}> and updates it on the UI
  // thread whenever the canvas is laid out or resized — no bridge needed.
  return (
    <Canvas style={style} onSize={canvasSize}>
      <Picture picture={picture} />
    </Canvas>
  );
}
