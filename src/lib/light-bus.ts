// In-app pub/sub for the reward moments the tab bar renders: `lightEarned`
// fires from the ledger the instant an act earns light (the mote overlay
// listens), `moteArrived` fires when a mote reaches the tab-bar moon (the moon
// listens, and pulses). Pure TS — no React, no native — so stores can emit and
// tests stay quiet.

import type { LightEvent } from '@/lib/moon-light';

type Listener<T> = (payload: T) => void;

function channel<T>() {
  const listeners = new Set<Listener<T>>();
  return {
    subscribe(listener: Listener<T>): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(payload: T): void {
      for (const listener of listeners) {
        try {
          listener(payload);
        } catch {
          // A broken listener never blocks the write path that emitted.
        }
      }
    },
  };
}

export const lightEarned = channel<LightEvent>();
export const moteArrived = channel<LightEvent>();
