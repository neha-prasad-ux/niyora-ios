// The hold's twenty-minute countdown, kept OUTSIDE React so it survives moving
// between the colouring page and the sky page: the wait is ONE continuous
// twenty minutes, not restarted each time she changes what she is doing with it.
//
// Remaining time is derived from a START TIMESTAMP, never from counting ticks.
// The whole point of the hold is that she can put the phone down, which suspends
// the JS runtime and freezes any interval, a clock stays honest across that
// gap, a tick counter would lie when she comes back.

import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export const HOLD_MS = 20 * 60 * 1000;

let startedAt: number | null = null;

/** Begin the hold, or leave a running one running. Idempotent, so moving from
 *  the colouring page to the sky page does not reset the clock. */
export function startHold(): void {
  startedAt ??= Date.now();
}

/** Drop the clock, so the NEXT hold starts fresh from twenty minutes. Called
 *  when a hold is entered, and when the moment ends. */
export function resetHold(): void {
  startedAt = null;
}

export function holdRemaining(): number {
  if (startedAt == null) return HOLD_MS;
  return Math.max(0, HOLD_MS - (Date.now() - startedAt));
}

/** Live countdown for a hold activity screen (colouring, sky). Starts the clock
 *  on mount if it is not already running, fires `onComplete` once the instant it
 *  reaches zero, and recomputes on return from background, where the interval
 *  has not been running. Returns the remaining ms and the 0..1 elapsed fraction. */
export function useHoldCountdown(onComplete: () => void): {
  remaining: number;
  pct: number;
} {
  const [remaining, setRemaining] = useState(HOLD_MS);
  const fired = useRef(false);
  const cb = useRef(onComplete);
  cb.current = onComplete;

  useEffect(() => {
    startHold();
    const tick = () => {
      const left = holdRemaining();
      setRemaining(left);
      if (left <= 0 && !fired.current) {
        fired.current = true;
        cb.current();
      }
    };
    tick();
    // Half-second cadence so mm:ss never visibly stalls a beat behind the clock.
    const id = setInterval(tick, 500);
    // On return from background the interval has not fired; recompute at once
    // rather than waiting up to half a second for the next tick.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  const pct = Math.min(1, Math.max(0, (HOLD_MS - remaining) / HOLD_MS));
  return { remaining, pct };
}
