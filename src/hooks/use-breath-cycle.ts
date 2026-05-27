import { useEffect, useState } from 'react';

export type PhaseType = 'inhale' | 'hold' | 'exhale';

type Phase = { type: PhaseType; durationMs: number };

const BOX_PHASES: Phase[] = [
  { type: 'inhale', durationMs: 4000 },
  { type: 'hold', durationMs: 4000 },
  { type: 'exhale', durationMs: 4000 },
  { type: 'hold', durationMs: 4000 },
];

// HSL triples matching Mac visual.colors for Box breathing
const PHASE_COLORS: Record<PhaseType, [number, number, number]> = {
  inhale: [230, 28, 12],
  hold: [250, 18, 11],
  exhale: [210, 22, 11],
};

export type BreathCycleResult = {
  phase: PhaseType;
  targetColor: [number, number, number];
};

export function useBreathCycle(): BreathCycleResult {
  const [index, setIndex] = useState(0);
  const current = BOX_PHASES[index];

  useEffect(() => {
    const id = setTimeout(
      () => setIndex((i) => (i + 1) % BOX_PHASES.length),
      current.durationMs,
    );
    return () => clearTimeout(id);
  }, [index, current.durationMs]);

  return {
    phase: current.type,
    targetColor: PHASE_COLORS[current.type],
  };
}
