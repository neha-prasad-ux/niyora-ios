// Drives a breathing session's phase timer. Given an ordered list of phases
// and a rounds count, it ticks through them once per ~16ms and reports the
// current phase, its label, and a 0-to-1 progress within that phase. When
// all rounds finish it sets `done`.

import { useEffect, useRef, useState } from 'react';

import type { BreathPhase } from '@/models/techniques';

export type BreathCycleState = {
  phase: BreathPhase;
  phaseIndex: number;
  /** 0..1 progress within the current phase */
  phaseT: number;
  /** 0..1 progress through the whole session */
  sessionT: number;
  round: number;
  done: boolean;
  paused: boolean;
};

const TICK_MS = 50;

export function useBreathCycle(
  phases: readonly BreathPhase[],
  rounds: number,
  paused = false
): BreathCycleState {
  const [state, setState] = useState<BreathCycleState>(() => ({
    phase: phases[0],
    phaseIndex: 0,
    phaseT: 0,
    sessionT: 0,
    round: 1,
    done: false,
    paused: false,
  }));

  const startRef = useRef<number>(Date.now());
  // Non-null while paused; holds the wall-clock time when pause began.
  const pausedAtRef = useRef<number | null>(null);
  const phaseDurationsTotal = phases.reduce((sum, p) => sum + p.duration, 0);
  const totalSeconds = phaseDurationsTotal * rounds;

  // When pausing: snapshot the wall clock. On resume: advance startRef by
  // the gap so elapsed time never counts the pause window.
  useEffect(() => {
    if (paused) {
      pausedAtRef.current = Date.now();
    } else if (pausedAtRef.current !== null) {
      startRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setState((s) => ({ ...s, paused }));
  }, [paused]);

  useEffect(() => {
    startRef.current = Date.now();
    pausedAtRef.current = null;
    const interval = setInterval(() => {
      if (pausedAtRef.current !== null) return; // frozen while paused
      const elapsed = (Date.now() - startRef.current) / 1000;
      if (elapsed >= totalSeconds) {
        setState((s) => ({ ...s, done: true, sessionT: 1, phaseT: 1 }));
        clearInterval(interval);
        return;
      }

      // Walk the phases to find where we are.
      let t = elapsed;
      let phaseIndex = 0;
      let round = 1;
      let cycles = Math.floor(elapsed / phaseDurationsTotal);
      round = Math.min(rounds, cycles + 1);
      t = elapsed - cycles * phaseDurationsTotal;

      for (let i = 0; i < phases.length; i++) {
        if (t < phases[i].duration) {
          phaseIndex = i;
          break;
        }
        t -= phases[i].duration;
      }
      const phase = phases[phaseIndex];
      const phaseT = Math.min(1, t / phase.duration);
      const sessionT = elapsed / totalSeconds;

      setState((s) => ({ ...s, phase, phaseIndex, phaseT, sessionT, round, done: false }));
    }, TICK_MS);
    return () => clearInterval(interval);
    // The technique is fixed for the lifetime of the session screen, so
    // re-running this on phases/rounds change is intentional and rare.
  }, [phases, rounds, phaseDurationsTotal, totalSeconds]);

  return state;
}
