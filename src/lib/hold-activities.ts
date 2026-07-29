// Which settling activities she has finished in THIS hold (colour, story, move,
// breath). Kept outside React, like the old hold clock, so an activity screen can
// mark itself done and the menu underneath re-renders to show the check — even
// though they are separate routes. Cleared when a fresh hold starts.

import { useSyncExternalStore } from 'react';

export type ActivityId = 'colour' | 'story' | 'move' | 'breath';

let done: ReadonlySet<ActivityId> = new Set();
const subs = new Set<() => void>();

function emit() {
  subs.forEach((f) => f());
}

/** Mark an activity finished (she hit Done on it). Idempotent. */
export function markActivityDone(id: ActivityId): void {
  if (done.has(id)) return;
  const next = new Set(done);
  next.add(id);
  done = next;
  emit();
}

export function isActivityDone(id: ActivityId): boolean {
  return done.has(id);
}

/** Clear the marks for a new hold. */
export function resetActivities(): void {
  if (done.size === 0) return;
  done = new Set();
  emit();
}

/** Subscribe a component to the done-set so the menu updates the instant an
 *  activity marks itself finished. Returns the current set (identity changes on
 *  every update, so it is a valid useSyncExternalStore snapshot). */
export function useActivitiesDone(): ReadonlySet<ActivityId> {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => done,
  );
}
