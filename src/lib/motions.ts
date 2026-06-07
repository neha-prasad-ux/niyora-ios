/**
 * Particle physics for the breathing session visualiser.
 *
 * Ports the Mac BreathingSession.tsx motion system to React Native / Reanimated
 * worklets.  All functions are annotated 'worklet' so they run on the UI thread
 * alongside useFrameCallback.
 *
 * Integration loop (per particle, per frame) is the same spring-damped model
 * as the Mac:
 *   vx = vx * 0.92 + fx * dt * 8   (friction=0.92, force gain=8)
 *   speed capped at 1.8 px/frame
 *
 * Noise drift uses noise2D from ./noise to produce organic inter-phase motion
 * rather than random jitter.
 */

import { noise2D } from './noise';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PhaseType = 'inhale' | 'exhale' | 'hold' | 'hold2';

export type MotionType =
  | 'converge'   // Box Breath
  | 'wave'       // Ocean Breath
  | 'snowfall'   // Cooling Breath
  | 'alternate'  // Alternate Nostril
  | 'lunar'      // Left Nostril (Chandra)
  | 'belly'      // Belly Breath
  | 'sedation'   // Wind Down
  | 'river'      // Five Senses
  | 'warmPulse'  // Warm Pulse
  | 'orbit'      // Orbit
  | 'sensory'    // Sensory
  | 'ambient';   // Ambient

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeY: number;          // resting Y used by wave/belly
  homeAngle: number;      // fixed radial angle from centre, for breath motions
  homeR: number;          // 0..1 radial position (area-uniform) so the field fills, not rings
  baseSize: number;
  size: number;
  opacity: number;
  hue: number;
  noiseOffsetX: number;   // per-particle noise seed
  noiseOffsetY: number;
  side: -1 | 1;           // used by alternate-nostril
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerpVal(current: number, target: number, speed: number): number {
  'worklet';
  return current + (target - current) * Math.min(speed, 1);
}

// ---------------------------------------------------------------------------
// Motion functions
// Each receives a MUTABLE particle reference (in a worklet, object fields can
// be assigned directly) and returns the net force {fx, fy}.  The function may
// also mutate p.opacity and p.size for per-phase visual feedback.
//
// Args:
//   p           - particle (mutable)
//   ndx / ndy   - unit vector from particle toward canvas centre
//   dist        - distance from canvas centre (+ 0.1 epsilon)
//   phaseType   - current breath phase
//   phaseT      - 0..1 progress within that phase
//   t           - elapsed time in seconds
//   dt          - frame delta in seconds
//   nx / ny     - noise sample for this particle at this frame
// ---------------------------------------------------------------------------

/**
 * Box Breath — faithful port of the Mac converge motion. Each particle is
 * pulled toward the centre on inhale with an inverse-distance "suck" (far
 * particles accelerate hard, the whole field rushes in fast), pushed back out
 * on exhale, and barely held on hold. Full per-particle noise is mixed straight
 * into the force so the motion is alive and never stable, exactly like the Mac.
 * Edge containment in the integrator keeps the dispersed field on-screen, so it
 * fills the phone rather than collapsing to a tiny cluster.
 */
function motionConverge(
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number,
  cx: number, cy: number
): { fx: number; fy: number } {
  'worklet';
  // Per-particle organic drift mixed straight into the force so every particle
  // keeps its own restless dance (the Mac "not stable" feel) — but kept below
  // the breath force so the gather still reads clearly.
  let fx = nx * 0.6, fy = ny * 0.6;

  if (phaseType === 'inhale') {
    // Strong spring straight to the centre. Because the force scales with the
    // distance from centre, the particles farthest out are pulled hardest, so
    // the whole wide phone field rushes in fast and gathers — the Mac "suck to
    // centre" feel, fixed for the phone's much larger spread. k ramps up over
    // the inhale so the pull accelerates as you breathe in.
    const k = 0.05 + phaseT * 0.12;
    fx += (cx - p.x) * k;
    fy += (cy - p.y) * k;
    p.opacity = lerpVal(p.opacity, 0.55 + phaseT * 0.25, dt * 2);
    p.size = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.35), dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    // Held breath: hover near the centre, opacity shimmers (alive, not frozen).
    fx += (cx - p.x) * 0.025;
    fy += (cy - p.y) * 0.025;
    p.opacity = lerpVal(p.opacity, 0.6 + Math.sin(t * 2 + p.noiseOffsetX) * 0.12, dt * 2);
  } else {
    // Exhale: release back out along each particle's own ray so the field
    // disperses evenly across the whole screen instead of snapping to the edges.
    const rf = 0.2 + phaseT * 0.8;
    const tx = cx + Math.cos(p.homeAngle) * p.homeR * cx * 0.92 * rf;
    const ty = cy + Math.sin(p.homeAngle) * p.homeR * cy * 0.88 * rf;
    const k = 0.05 + phaseT * 0.06;
    fx += (tx - p.x) * k;
    fy += (ty - p.y) * k;
    p.opacity = lerpVal(p.opacity, 0.5 - phaseT * 0.15, dt * 2);
    p.size = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.18), dt * 2);
  }
  return { fx, fy };
}

/**
 * Ocean Breath — left-to-right wave with sine-based vertical undulation.
 * homeY acts as a per-particle phase offset so the wave travels naturally.
 */
function motionWave(
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number,
  cx: number, cy: number
): { fx: number; fy: number } {
  'worklet';
  let fx = nx * 0.3, fy = ny * 0.3;
  // Ocean sway: gentle per-particle undulation over the breath.
  fy += Math.sin(t * 1.1 + p.homeAngle * 2) * 0.5;
  fx += Math.cos(t * 0.9 + p.homeAngle * 2) * 0.25;
  let rf: number;
  if (phaseType === 'inhale') {
    rf = 1 - phaseT * 0.8;
    p.opacity = lerpVal(p.opacity, 0.6 + phaseT * 0.15, dt * 2);
    p.size = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.2), dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    rf = 0.22;
    p.opacity = lerpVal(p.opacity, 0.6, dt * 2);
  } else {
    rf = 0.22 + phaseT * 0.78;
    p.opacity = lerpVal(p.opacity, 0.45 - phaseT * 0.1, dt * 2);
    p.size = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.1), dt * 2);
  }
  const txp = cx + Math.cos(p.homeAngle) * p.homeR * cx * 0.88 * rf;
  const typ = cy + Math.sin(p.homeAngle) * p.homeR * cy * 0.84 * rf;
  fx += (txp - p.x) * 0.05;
  fy += (typ - p.y) * 0.05;
  return { fx, fy };
}

/**
 * Cooling Breath — particles fall like snowflakes on exhale (cooling air),
 * float upward on inhale.  Gentle horizontal drift from noise field.
 */
function motionSnowfall(
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number,
  cx: number, cy: number
): { fx: number; fy: number } {
  'worklet';
  let fx = nx * 0.4, fy = ny * 0.4;
  fx += Math.sin(t * 0.6 + p.noiseOffsetX) * 0.15; // drifting snow
  let rf: number;
  if (phaseType === 'inhale') {
    rf = 1 - phaseT * 0.78;
    p.opacity = lerpVal(p.opacity, 0.65, dt * 2);
    p.size = lerpVal(p.size, p.baseSize * 1.05, dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    rf = 0.24;
    p.opacity = lerpVal(p.opacity, 0.6, dt * 2);
  } else {
    rf = 0.24 + phaseT * 0.76;
    fy += 0.18; // settle downward like falling snow on exhale
    p.opacity = lerpVal(p.opacity, 0.5 - phaseT * 0.1, dt * 2);
    p.size = lerpVal(p.size, p.baseSize * 0.92, dt * 2);
  }
  const txp = cx + Math.cos(p.homeAngle) * p.homeR * cx * 0.88 * rf;
  const typ = cy + Math.sin(p.homeAngle) * p.homeR * cy * 0.84 * rf;
  fx += (txp - p.x) * 0.05;
  fy += (typ - p.y) * 0.05;
  return { fx, fy };
}

/**
 * Alternate Nostril — uses p.side (-1 = left, 1 = right).  On inhale,
 * particles draw from their assigned side toward centre; on exhale they
 * push out to the opposite side.
 */
function motionAlternate(
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number,
  cx: number, cy: number
): { fx: number; fy: number } {
  'worklet';
  let fx = nx * 0.3, fy = ny * 0.3;
  // Breath gathers toward one side on inhale, crosses to the other on exhale.
  let rf: number;
  let cxo = cx;
  if (phaseType === 'inhale') {
    rf = 1 - phaseT * 0.78;
    cxo = cx + p.side * cx * 0.4 * phaseT; // gather toward this side
    p.opacity = lerpVal(p.opacity, 0.6, dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    rf = 0.3;
    cxo = cx + p.side * cx * 0.4;
    p.opacity = lerpVal(p.opacity, 0.62, dt * 2);
  } else {
    rf = 0.3 + phaseT * 0.7;
    cxo = cx + p.side * cx * 0.4 - p.side * cx * 0.8 * phaseT; // cross over
    p.opacity = lerpVal(p.opacity, 0.45 - phaseT * 0.12, dt * 2);
  }
  const txp = cxo + Math.cos(p.homeAngle) * p.homeR * cx * 0.55 * rf;
  const typ = cy + Math.sin(p.homeAngle) * p.homeR * cy * 0.78 * rf;
  fx += (txp - p.x) * 0.05;
  fy += (typ - p.y) * 0.05;
  return { fx, fy };
}

/**
 * Left Nostril (Chandra) — calming, moon-quality motion.  Gentle leftward
 * orbital pull with soft CCW rotation.
 */
function motionLunar(
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number,
  cx: number, cy: number
): { fx: number; fy: number } {
  'worklet';
  // Left Nostril: the field drifts to the left on the in-breath and sweeps
  // across to the right on the out-breath.
  let fx = nx * 0.3, fy = ny * 0.3;
  let rf: number;
  let cxo: number;
  if (phaseType === 'inhale') {
    rf = 1 - phaseT * 0.65;
    cxo = cx - cx * 0.4 * phaseT;
    p.opacity = lerpVal(p.opacity, 0.55 + phaseT * 0.15, dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    rf = 0.4;
    cxo = cx - cx * 0.4;
    p.opacity = lerpVal(p.opacity, 0.58, dt * 2);
  } else {
    rf = 0.4 + phaseT * 0.5;
    cxo = cx - cx * 0.4 + cx * 0.8 * phaseT;
    p.opacity = lerpVal(p.opacity, 0.4 - phaseT * 0.1, dt * 2);
  }
  const txp = cxo + Math.cos(p.homeAngle) * p.homeR * cx * 0.5 * rf;
  const typ = cy + Math.sin(p.homeAngle) * p.homeR * cy * 0.62 * rf;
  fx += (txp - p.x) * 0.05;
  fy += (typ - p.y) * 0.05;
  return { fx, fy };
}

/**
 * Belly Breath — downward pull on inhale (belly expands), gentle rebound on
 * exhale.  homeY anchors the rest position for each particle.
 */
function motionBelly(
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number,
  cx: number, cy: number
): { fx: number; fy: number } {
  'worklet';
  // Belly expands on the in-breath (field blooms outward) and softens back in
  // on the out-breath — the inverse of converge, with a taller vertical reach.
  let fx = nx * 0.3, fy = ny * 0.3;
  let rf: number;
  if (phaseType === 'inhale') {
    rf = 0.3 + phaseT * 0.7;
    p.opacity = lerpVal(p.opacity, 0.6 + phaseT * 0.15, dt * 2);
    p.size = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.25), dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    rf = 0.95;
    p.opacity = lerpVal(p.opacity, 0.6, dt * 2);
  } else {
    rf = 1 - phaseT * 0.7;
    p.opacity = lerpVal(p.opacity, 0.45 - phaseT * 0.1, dt * 2);
    p.size = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.15), dt * 2);
  }
  const txp = cx + Math.cos(p.homeAngle) * p.homeR * cx * 0.8 * rf;
  const typ = cy + Math.sin(p.homeAngle) * p.homeR * cy * 0.9 * rf;
  fx += (txp - p.x) * 0.05;
  fy += (typ - p.y) * 0.05;
  return { fx, fy };
}

/**
 * Wind Down (Sedation) — identical to converge but all forces attenuated by
 * roundProgress so the field calms to near-stillness as rounds accumulate.
 */
function motionSedation(
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number,
  roundProgress: number,
  cx: number, cy: number
): { fx: number; fy: number } {
  'worklet';
  // Wind Down: the same breath as converge, but the dispersed extent shrinks as
  // the rounds accumulate, so the field calms inward toward stillness.
  const calm = 1 - roundProgress * 0.5;
  let fx = nx * 0.3 * calm, fy = ny * 0.3 * calm;
  let rf: number;
  if (phaseType === 'inhale') {
    rf = 1 - phaseT * 0.82;
    p.opacity = lerpVal(p.opacity, 0.5 + phaseT * 0.15, dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    rf = 0.18;
    p.opacity = lerpVal(p.opacity, 0.5, dt * 2);
  } else {
    rf = 0.18 + phaseT * 0.82;
    p.opacity = lerpVal(p.opacity, 0.4 - phaseT * 0.1, dt * 2);
  }
  const disp = 0.5 + 0.38 * calm;
  const txp = cx + Math.cos(p.homeAngle) * p.homeR * cx * disp * rf;
  const typ = cy + Math.sin(p.homeAngle) * p.homeR * cy * (disp - 0.04) * rf;
  fx += (txp - p.x) * 0.05;
  fy += (typ - p.y) * 0.05;
  return { fx, fy };
}

/**
 * Five Senses (River) — steady directional flow like a slow current.
 * Inhale draws upstream, exhale accelerates downstream.
 */
function motionRiver(
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number
): { fx: number; fy: number } {
  'worklet';
  // Gentle rightward current; noise adds organic turbulence
  const current = 0.18;
  const turbulence = Math.sin(t * 0.7 + p.noiseOffsetY) * 0.08;
  let fx = nx * 0.5 + current, fy = ny * 0.5 + turbulence;
  if (phaseType === 'inhale') {
    fx -= current * (0.6 + phaseT * 0.8); // swim upstream
    p.opacity = lerpVal(p.opacity, 0.6 + phaseT * 0.2, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.18), dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    // Drift with current
    p.opacity = lerpVal(p.opacity, 0.62 + Math.sin(t * 1.2 + p.noiseOffsetX) * 0.06, dt * 2);
  } else { // exhale - flow downstream faster
    fx += current * (0.5 + phaseT * 0.7);
    p.opacity = lerpVal(p.opacity, 0.45 - phaseT * 0.1, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.1), dt * 2);
  }
  return { fx, fy };
}

/**
 * Warm Pulse — particles radiate outward with warmth on inhale, draw back on
 * exhale.  Distance amplification gives a pulsing quality.
 */
function motionWarmPulse(
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number
): { fx: number; fy: number } {
  'worklet';
  const pulse = Math.sin(t * 3.0 + p.noiseOffsetX) * 0.04;
  let fx = nx + pulse, fy = ny + pulse;
  if (phaseType === 'inhale') {
    // Push outward with warmth
    const str = 0.25 + phaseT * 0.55;
    fx -= ndx * str * (1 + 35 / (dist + 25));
    fy -= ndy * str * (1 + 35 / (dist + 25));
    p.opacity = lerpVal(p.opacity, 0.7 + phaseT * 0.15, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.35), dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    fx *= 0.4; fy *= 0.4;
    p.opacity = lerpVal(p.opacity, 0.68 + pulse * 2, dt * 2);
  } else { // exhale - gentle inward return
    const str = 0.15 + phaseT * 0.4;
    fx += ndx * str;
    fy += ndy * str;
    p.opacity = lerpVal(p.opacity, 0.45 - phaseT * 0.15, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.2), dt * 2);
  }
  return { fx, fy };
}

/**
 * Orbit — particles maintain a circular orbit around the centre; inhale
 * tightens the orbit (inward spiral), exhale widens it.
 */
function motionOrbit(
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number
): { fx: number; fy: number } {
  'worklet';
  // CCW tangent
  const tx = -ndy;
  const ty =  ndx;
  // Centripetal force to maintain orbit radius ~ 80px
  const targetDist = 80;
  const radial = (dist - targetDist) * 0.006;
  let fx = nx * 0.3 + tx * 0.4 - ndx * radial;
  let fy = ny * 0.3 + ty * 0.4 - ndy * radial;
  if (phaseType === 'inhale') {
    // Spiral inward
    const str = 0.15 + phaseT * 0.3;
    fx += ndx * str;
    fy += ndy * str;
    p.opacity = lerpVal(p.opacity, 0.6 + phaseT * 0.2, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.2), dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    // Stable orbit
    p.opacity = lerpVal(p.opacity, 0.65 + Math.sin(t * 2 + p.noiseOffsetX) * 0.08, dt * 2);
  } else { // exhale - widen orbit
    const str = 0.12 + phaseT * 0.28;
    fx -= ndx * str;
    fy -= ndy * str;
    p.opacity = lerpVal(p.opacity, 0.45 - phaseT * 0.12, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.15), dt * 2);
  }
  return { fx, fy };
}

/**
 * Sensory — each particle has a distinct "personality" derived from
 * noiseOffsetX that blends converge, orbit, and drift behaviours.  Creates a
 * rich, varied field that emphasises sensory variety.
 */
function motionSensory(
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number
): { fx: number; fy: number } {
  'worklet';
  const personality = (p.noiseOffsetX % 3) / 3; // 0..1 personality factor
  const tx = -ndy;
  const ty =  ndx;
  let fx = nx, fy = ny;
  if (phaseType === 'inhale') {
    const str = 0.2 + phaseT * 0.5;
    // Mix of converge and orbit per personality
    fx += ndx * str * (1 - personality) * (1 + 40 / (dist + 20));
    fy += ndy * str * (1 - personality) * (1 + 40 / (dist + 20));
    fx += tx * str * personality;
    fy += ty * str * personality;
    p.opacity = lerpVal(p.opacity, 0.55 + phaseT * 0.25, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.25), dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    fx += tx * 0.12 * personality;
    fy += ty * 0.12 * personality;
    p.opacity = lerpVal(p.opacity, 0.6 + Math.sin(t * 2.5 + p.noiseOffsetY) * 0.1, dt * 2);
  } else { // exhale
    const str = 0.15 + phaseT * 0.45;
    fx -= ndx * str * (1 + 25 / (dist + 30));
    fy -= ndy * str * (1 + 25 / (dist + 30));
    fx += tx * 0.08;
    fy += ty * 0.08;
    p.opacity = lerpVal(p.opacity, 0.4 - phaseT * 0.15, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.18), dt * 2);
  }
  return { fx, fy };
}

/**
 * Ambient — noise-dominated; very gentle, almost no phase-based force.
 * Intended as the default fallback for unspecified techniques.
 */
function motionAmbient(
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number
): { fx: number; fy: number } {
  'worklet';
  let fx = nx, fy = ny;
  // Very soft centre attraction prevents escape
  fx += ndx * 0.04;
  fy += ndy * 0.04;
  if (phaseType === 'inhale') {
    p.opacity = lerpVal(p.opacity, 0.5 + phaseT * 0.15, dt * 1.5);
    p.size    = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.12), dt * 1.5);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    p.opacity = lerpVal(p.opacity, 0.55 + Math.sin(t * 1.8 + p.noiseOffsetX) * 0.08, dt * 1.5);
  } else {
    p.opacity = lerpVal(p.opacity, 0.38 - phaseT * 0.08, dt * 1.5);
    p.size    = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.1), dt * 1.5);
  }
  return { fx, fy };
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

function applyMotion(
  motion: MotionType,
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number,
  roundProgress: number,
  cx: number, cy: number
): { fx: number; fy: number } {
  'worklet';
  if (motion === 'converge')  return motionConverge (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny, cx, cy);
  if (motion === 'wave')      return motionWave     (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny, cx, cy);
  if (motion === 'snowfall')  return motionSnowfall (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny, cx, cy);
  if (motion === 'alternate') return motionAlternate(p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny, cx, cy);
  if (motion === 'lunar')     return motionLunar    (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny, cx, cy);
  if (motion === 'belly')     return motionBelly    (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny, cx, cy);
  if (motion === 'sedation')  return motionSedation (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny, roundProgress, cx, cy);
  if (motion === 'river')     return motionRiver    (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny);
  if (motion === 'warmPulse') return motionWarmPulse(p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny);
  if (motion === 'orbit')     return motionOrbit    (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny);
  if (motion === 'sensory')   return motionSensory  (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny);
  return motionAmbient(p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny);
}

// ---------------------------------------------------------------------------
// Integration step  (verbatim Mac spring-damped model)
// ---------------------------------------------------------------------------

/**
 * Advance one particle by one frame using the spring-damped integrator.
 * Returns a new Particle object; does not mutate the input.
 *
 * friction = 0.92, force gain = dt * 8, speed cap = 1.8 px/frame
 */
export function updateParticle(
  particle: Particle,
  cx: number, cy: number,
  motion: MotionType,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  roundProgress: number
): Particle {
  'worklet';

  // Noise drift (organic inter-phase motion)
  const nx = noise2D(particle.noiseOffsetX + t * 0.3, particle.noiseOffsetY) * 0.8;
  const ny = noise2D(particle.noiseOffsetX, particle.noiseOffsetY + t * 0.3) * 0.8;

  // Direction toward canvas centre
  const dx   = cx - particle.x;
  const dy   = cy - particle.y;
  const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
  const ndx  = dx / dist;
  const ndy  = dy / dist;

  // Mutable copy for motion function to update opacity/size
  const p: Particle = {
    x:            particle.x,
    y:            particle.y,
    vx:           particle.vx,
    vy:           particle.vy,
    homeY:        particle.homeY,
    homeAngle:    particle.homeAngle,
    homeR:        particle.homeR,
    baseSize:     particle.baseSize,
    size:         particle.size,
    opacity:      particle.opacity,
    hue:          particle.hue,
    noiseOffsetX: particle.noiseOffsetX,
    noiseOffsetY: particle.noiseOffsetY,
    side:         particle.side,
  };

  const force = applyMotion(
    motion, p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny, roundProgress, cx, cy
  );

  // Spring-damped integrate. On a breath hold the field should settle into
  // stillness (a held breath), not keep drifting — but several motions don't
  // damp their own noise/drift during hold. So globally clamp down here:
  // stronger friction bleeds off residual velocity fast, and the force (which
  // includes the per-particle noise) is admitted at a whisper, so particles
  // glide to a near-stop and hover. Opacity/size still pulse (set in the motion
  // fns) so the field reads as a glowing pause rather than a dead freeze.
  const holding = phaseType === 'hold' || phaseType === 'hold2';
  // On a hold the field settles but stays alive — the Mac never freezes it. Bleed
  // off velocity a little faster and admit the force (incl. per-particle noise)
  // at a fraction, so particles hover and drift gently rather than locking dead.
  const friction = holding ? 0.9 : 0.92;
  const forceScale = holding ? 0.35 : 1;
  let vx = p.vx * friction + force.fx * dt * 8 * forceScale;
  let vy = p.vy * friction + force.fy * dt * 8 * forceScale;

  // Speed cap — higher off-hold so the field can sweep across the taller phone
  // screen within a phase (the Mac's 1.8 was tuned to a smaller canvas).
  const maxSpeed = holding ? 1.8 : 2.8;
  const spd = Math.sqrt(vx * vx + vy * vy);
  if (spd > maxSpeed) {
    vx = (vx / spd) * maxSpeed;
    vy = (vy / spd) * maxSpeed;
  }

  // Edge containment (mirrors the Mac global boundary): the field should fill
  // the whole screen and only get nudged back once a particle nears the real
  // edge. A proportional spring within `margin` of each edge keeps particles
  // on-screen without letting them escape, while leaving the entire interior
  // free so the field spreads edge to edge instead of clustering centrally.
  if (cx > 0 && cy > 0) {
    const w = cx * 2;
    const h = cy * 2;
    const margin = 24;
    if (p.x < margin) vx += (margin - p.x) * 0.06;
    else if (p.x > w - margin) vx -= (p.x - (w - margin)) * 0.06;
    if (p.y < margin) vy += (margin - p.y) * 0.06;
    else if (p.y > h - margin) vy -= (p.y - (h - margin)) * 0.06;
  }

  p.x  += vx;
  p.y  += vy;
  p.vx  = vx;
  p.vy  = vy;

  return p;
}
