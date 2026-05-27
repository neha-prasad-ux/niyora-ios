// Ambient particle field for the breath session screen. ~40 small dots that
// drift slowly behind the breath text. On inhale they converge gently toward
// the center and grow brighter; on exhale they disperse outward and dim; on
// hold they slow to a near-stop.
//
// Implementation note: each particle is an SVG <Circle>. We update positions
// in a 30fps JS loop and re-render. Forty circles per frame is well within
// what React Native can handle; if we ever go above 80 we should switch to
// Reanimated worklets or react-native-skia.

import { useEffect, useMemo, useRef, useState } from 'react';
import Svg, { Circle } from 'react-native-svg';

import type { PhaseType } from '@/models/techniques';

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseSize: number;
  size: number;
  hue: number;
  opacity: number;
};

type ParticleFieldProps = {
  width: number;
  height: number;
  phase: PhaseType;
  /** 0..1 progress within the current phase */
  phaseT: number;
  /** Hue (0-360) of the current phase color */
  hue: number;
  /** Approximate particle count */
  count?: number;
};

const FRAME_MS = 33; // ~30fps. Smooth enough for ambient particles, cheaper on battery.

function makeParticles(count: number, width: number, height: number, hue: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const baseSize = 1.5 + Math.random() * 2.5;
    out.push({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      baseSize,
      size: baseSize,
      hue: hue + (Math.random() - 0.5) * 15,
      opacity: 0.55 + Math.random() * 0.35,
    });
  }
  return out;
}

export function ParticleField({
  width,
  height,
  phase,
  phaseT,
  hue,
  count = 55,
}: ParticleFieldProps) {
  const [, force] = useState(0); // re-render tick
  const particlesRef = useRef<Particle[]>(makeParticles(count, width, height, hue));
  const phaseRef = useRef({ phase, phaseT, hue });
  phaseRef.current = { phase, phaseT, hue };

  // Replenish hue drift when phase changes.
  useEffect(() => {
    for (const p of particlesRef.current) {
      p.hue = hue + (Math.random() - 0.5) * 15;
    }
  }, [hue]);

  useEffect(() => {
    let frame = 0;
    const cx = width / 2;
    const cy = height / 2;

    const interval = setInterval(() => {
      frame++;
      const { phase: ph, phaseT: pt } = phaseRef.current;
      const ps = particlesRef.current;

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        const dx = cx - p.x;
        const dy = cy - p.y;
        const distSq = dx * dx + dy * dy;
        // Particles near the center barely move; ones at the edge move
        // more. Stops the field from balling up at the center over time.
        const distFactor = Math.min(1, distSq / (width * width * 0.18));

        if (ph === 'inhale') {
          const strength = 0.00025 * (0.4 + pt) * distFactor;
          p.vx += dx * strength;
          p.vy += dy * strength;
          p.opacity = lerp(p.opacity, 0.7 + pt * 0.2, 0.05);
          p.size = lerp(p.size, p.baseSize * (1 + pt * 0.35), 0.05);
        } else if (ph === 'hold') {
          // Slow drift, slight upward float.
          p.vy -= 0.001 * pt;
          p.opacity = lerp(p.opacity, 0.7 - pt * 0.1, 0.04);
          p.size = lerp(p.size, p.baseSize * (1 - pt * 0.1), 0.04);
        } else {
          // exhale: push outward and dim.
          const strength = 0.00025 * (0.3 + pt);
          p.vx -= dx * strength;
          p.vy -= dy * strength;
          p.opacity = lerp(p.opacity, 0.5 - pt * 0.1, 0.05);
          p.size = lerp(p.size, p.baseSize * (1 - pt * 0.1), 0.05);
        }

        // Ambient wander so it never feels static.
        p.vx += (Math.random() - 0.5) * 0.08;
        p.vy += (Math.random() - 0.5) * 0.08;

        // Damping so particles don't fly off forever.
        p.vx *= 0.92;
        p.vy *= 0.92;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap softly at edges so the field stays full.
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        else if (p.y > height + 10) p.y = -10;
      }

      // Trigger a re-render. We don't replace the array; we just bump a
      // dummy counter so React commits the same SVG with the new positions
      // baked into the existing refs.
      force(frame);
    }, FRAME_MS);

    return () => clearInterval(interval);
  }, [width, height]);

  const particles = particlesRef.current;

  // Build a stable SVG once; individual <Circle> coords change every render
  // because they read directly from the mutated particle objects.
  const circles = useMemo(() => particles.map((p) => p.id), [particles]);

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {circles.map((id) => {
        const p = particles[id];
        return (
          <Circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={p.size}
            fill={`hsl(${p.hue}, 75%, 80%)`}
            opacity={p.opacity}
          />
        );
      })}
    </Svg>
  );
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}
