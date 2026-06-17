import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { liveStressTick } from '@/lib/stress-tick-live';

// Phase B3 — foreground trigger.
//
// Runs a stress tick when the app launches and each time it returns to the
// foreground, throttled so rapid background/foreground flips don't re-run it.
// This covers app-open time; the background HKObserverQuery trigger (B3 part 2,
// next) will cover app-closed time. Gated by `enabled` (the experiment only, not
// shipped in v1) and wired in the root layout.

const MIN_INTERVAL_MS = 2 * 60_000;

/** True when enough time has passed since the last tick to run again. */
export function shouldRunTick(
  lastRunMs: number,
  nowMs: number,
  minIntervalMs: number = MIN_INTERVAL_MS,
): boolean {
  return nowMs - lastRunMs >= minIntervalMs;
}

export function useStressTick(enabled: boolean): void {
  const lastRun = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const run = (trigger: string) => {
      const now = Date.now();
      if (!shouldRunTick(lastRun.current, now)) return;
      lastRun.current = now;
      liveStressTick()
        .then((r) => {
          if (!cancelled) {
            // Surfaces in the Metro logs — the tick is otherwise silent unless
            // it fires a nudge.
            console.log(
              `[stress-tick] ${trigger}: ${r.verdict.reason}/${r.decision.reason} fired=${r.fired}`,
            );
          }
        })
        .catch((e) => {
          if (!cancelled) console.log(`[stress-tick] error: ${e?.message ?? e}`);
        });
    };

    run('launch');
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run('foreground');
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [enabled]);
}
