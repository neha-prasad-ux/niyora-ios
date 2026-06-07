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
 * Box Breath — particles converge on inhale, orbit gently on hold, disperse
 * with upward drift on exhale.  Verbatim port of motionConverge from Mac.
 */
function motionConverge(
  p: Particle,
  ndx: number, ndy: number, dist: number,
  phaseType: PhaseType, phaseT: number,
  t: number, dt: number,
  nx: number, ny: number
): { fx: number; fy: number } {
  'worklet';
  let fx = nx, fy = ny;
  if (phaseType === 'inhale') {
    const str = 0.3 + phaseT * 0.7;
    fx += ndx * str * (1 + 50 / (dist + 20));
    fy += ndy * str * (1 + 50 / (dist + 20));
    p.opacity = lerpVal(p.opacity, 0.5 + phaseT * 0.2, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.3), dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    fx += ndx * 0.1; fy += ndy * 0.1;
    fx *= 0.3;       fy *= 0.3;
    p.opacity = lerpVal(p.opacity, 0.6 + Math.sin(t * 2 + p.noiseOffsetX) * 0.1, dt * 2);
  } else { // exhale
    const str = 0.2 + phaseT * 0.6;
    fx -= ndx * str * (1 + 30 / (dist + 30));
    fy -= ndy * str * (1 + 30 / (dist + 30));
    fy -= 0.15 * phaseT; // drift upward as they disperse
    p.opacity = lerpVal(p.opacity, 0.5 - phaseT * 0.2, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.2), dt * 2);
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
  nx: number, ny: number
): { fx: number; fy: number } {
  'worklet';
  let fx = nx, fy = ny;
  const wave = Math.sin(t * 1.5 + p.homeY * 0.05) * 0.3;
  if (phaseType === 'inhale') {
    fx += 0.4 + phaseT * 0.3; // rightward sweep
    fy += wave;
    p.opacity = lerpVal(p.opacity, 0.6 + phaseT * 0.2, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.2), dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    fx += 0.1;
    fy += wave * 0.5;
    p.opacity = lerpVal(p.opacity, 0.65, dt * 2);
  } else { // exhale - recede
    fx -= ndx * 0.15 * phaseT;
    fy += wave * 0.3;
    p.opacity = lerpVal(p.opacity, 0.4 - phaseT * 0.1, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.1), dt * 2);
  }
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
  nx: number, ny: number
): { fx: number; fy: number } {
  'worklet';
  let fx = nx * 0.6, fy = ny * 0.6;
  const drift = Math.sin(t * 0.8 + p.noiseOffsetX) * 0.12;
  if (phaseType === 'inhale') {
    fx += drift;
    fy -= 0.15 + phaseT * 0.25; // float upward on inhale
    p.opacity = lerpVal(p.opacity, 0.7, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * 1.1, dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    fx += drift * 0.4;
    fy -= 0.04;
    p.opacity = lerpVal(p.opacity, 0.6, dt * 2);
  } else { // exhale - fall like cooling snow
    fx += drift;
    fy += 0.18 + phaseT * 0.32;
    p.opacity = lerpVal(p.opacity, 0.5 - phaseT * 0.1, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * 0.9, dt * 2);
  }
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
  nx: number, ny: number
): { fx: number; fy: number } {
  'worklet';
  let fx = nx, fy = ny;
  if (phaseType === 'inhale') {
    const str = 0.3 + phaseT * 0.5;
    // Pull toward centre; side bias makes each half converge distinctly
    fx += ndx * str * (1 + 40 / (dist + 20)) - p.side * 0.15;
    fy += ndy * str * (1 + 40 / (dist + 20));
    p.opacity = lerpVal(p.opacity, 0.6 + phaseT * 0.2, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.2), dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    fx += ndx * 0.05; fy += ndy * 0.05;
    p.opacity = lerpVal(p.opacity, 0.65 + Math.sin(t * 2 + p.noiseOffsetX) * 0.08, dt * 2);
  } else { // exhale toward opposite side
    const str = 0.2 + phaseT * 0.5;
    fx -= ndx * str + p.side * (0.25 + phaseT * 0.2);
    fy -= ndy * str;
    p.opacity = lerpVal(p.opacity, 0.4 - phaseT * 0.15, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.15), dt * 2);
  }
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
  nx: number, ny: number
): { fx: number; fy: number } {
  'worklet';
  // Tangent for CCW orbit: perpendicular to the radial direction
  const tx = -ndy;
  const ty =  ndx;
  let fx = nx * 0.6, fy = ny * 0.6;
  if (phaseType === 'inhale') {
    const str = 0.2 + phaseT * 0.35;
    fx += ndx * str - 0.12; // slight leftward bias
    fy += ndy * str;
    fx += tx * 0.08;
    p.opacity = lerpVal(p.opacity, 0.55 + phaseT * 0.2, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.15), dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    fx += tx * 0.14 - 0.06;
    fy += ty * 0.14;
    p.opacity = lerpVal(p.opacity, 0.6 + Math.sin(t * 1.5 + p.noiseOffsetX) * 0.08, dt * 2);
  } else { // exhale - drift leftward and disperse
    const str = 0.12 + phaseT * 0.2;
    fx -= ndx * str - 0.1;
    fx += tx * 0.08;
    p.opacity = lerpVal(p.opacity, 0.4 - phaseT * 0.1, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.1), dt * 2);
  }
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
  nx: number, ny: number
): { fx: number; fy: number } {
  'worklet';
  let fx = nx * 0.4, fy = ny * 0.4;
  if (phaseType === 'inhale') {
    fx += ndx * 0.12;
    fy += 0.28 + phaseT * 0.45; // pull downward
    p.opacity = lerpVal(p.opacity, 0.65 + phaseT * 0.2, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.25), dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    fy += 0.06; // gentle settle at bottom
    p.opacity = lerpVal(p.opacity, 0.65, dt * 2);
  } else { // exhale - rise back toward homeY
    fy -= 0.12 + phaseT * 0.18;
    fx += ndx * 0.08 * phaseT;
    p.opacity = lerpVal(p.opacity, 0.45 - phaseT * 0.1, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.15), dt * 2);
  }
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
  roundProgress: number
): { fx: number; fy: number } {
  'worklet';
  const calm = 1 - roundProgress * 0.72; // 1.0 at start, 0.28 at end
  let fx = nx * calm, fy = ny * calm;
  if (phaseType === 'inhale') {
    const str = (0.25 + phaseT * 0.45) * calm;
    fx += ndx * str * (1 + 40 / (dist + 20));
    fy += ndy * str * (1 + 40 / (dist + 20));
    p.opacity = lerpVal(p.opacity, 0.55 * calm + 0.15, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 + phaseT * 0.15 * calm), dt * 2);
  } else if (phaseType === 'hold' || phaseType === 'hold2') {
    fx += ndx * 0.06 * calm; fy += ndy * 0.06 * calm;
    p.opacity = lerpVal(p.opacity, 0.5 * calm + 0.12, dt * 2);
  } else { // exhale
    const str = (0.15 + phaseT * 0.35) * calm;
    fx -= ndx * str * (1 + 25 / (dist + 30));
    fy -= ndy * str * (1 + 25 / (dist + 30));
    fy -= 0.1 * phaseT * calm;
    p.opacity = lerpVal(p.opacity, (0.35 - phaseT * 0.1) * calm + 0.1, dt * 2);
    p.size    = lerpVal(p.size, p.baseSize * (1 - phaseT * 0.12 * calm), dt * 2);
  }
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
  roundProgress: number
): { fx: number; fy: number } {
  'worklet';
  if (motion === 'converge')  return motionConverge (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny);
  if (motion === 'wave')      return motionWave     (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny);
  if (motion === 'snowfall')  return motionSnowfall (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny);
  if (motion === 'alternate') return motionAlternate(p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny);
  if (motion === 'lunar')     return motionLunar    (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny);
  if (motion === 'belly')     return motionBelly    (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny);
  if (motion === 'sedation')  return motionSedation (p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny, roundProgress);
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
    baseSize:     particle.baseSize,
    size:         particle.size,
    opacity:      particle.opacity,
    hue:          particle.hue,
    noiseOffsetX: particle.noiseOffsetX,
    noiseOffsetY: particle.noiseOffsetY,
    side:         particle.side,
  };

  const force = applyMotion(
    motion, p, ndx, ndy, dist, phaseType, phaseT, t, dt, nx, ny, roundProgress
  );

  // Spring-damped integrate
  let vx = p.vx * 0.92 + force.fx * dt * 8;
  let vy = p.vy * 0.92 + force.fy * dt * 8;

  // Speed cap
  const maxSpeed = 1.8;
  const spd = Math.sqrt(vx * vx + vy * vy);
  if (spd > maxSpeed) {
    vx = (vx / spd) * maxSpeed;
    vy = (vy / spd) * maxSpeed;
  }

  // Soft center containment. Several motions carry a constant directional drift
  // (wave sweeps right, river flows, lunar leans left, belly pulls down). The
  // Mac keeps these on-canvas with a global edge boundary plus per-motion
  // wrap-around; both were dropped in this port, so on the much narrower phone
  // screen the drift carried particles off the edge for good. A radial spring
  // that engages past ~half the field's extent and strengthens outward
  // overpowers the drift well before the edge — keeping the field gathered in
  // the centre instead of letting it escape or pile against a wall. It stays
  // dormant near the centre, so the noise-driven motions move freely.
  if (cx > 0 && cy > 0) {
    const rx = (p.x - cx) / cx; // -1 at left edge .. +1 at right edge
    const ry = (p.y - cy) / cy;
    const ENGAGE = 0.5;
    const PULL = 2.8;
    const ox = Math.abs(rx) - ENGAGE;
    const oy = Math.abs(ry) - ENGAGE;
    if (ox > 0) vx -= Math.sign(rx) * ox * PULL;
    if (oy > 0) vy -= Math.sign(ry) * oy * PULL;
  }

  p.x  += vx;
  p.y  += vy;
  p.vx  = vx;
  p.vy  = vy;

  return p;
}
