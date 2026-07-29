// In-memory resume for a rough-moment session. Deliberately the whole story:
// one module-scope variable, no AsyncStorage, no SecureStore, no import of any
// store/ module. If you are auditing whether her words touch disk, this file is
// the only place a session is held, and it holds it in RAM.
//
// Why it exists: the flow's best-evidenced beat is a 20 minute hold, and
// `body_do_now` tells her "go do it now, we'll wait." Before this, the screen
// discarded her after 5 minutes backgrounded, so the beat we most want her to
// complete was the one guaranteed to delete her. Now the session survives
// leaving the app for up to 30 minutes.
//
// Both promises stay intact: sessions are still ephemeral (this dies with the
// app, and nothing is ever written), and she can still be gone long enough that
// coming back should be a fresh start rather than a stale one.

import type { CompactState, DayPill, KeepCard, RoughStep } from './rough-moment-content';

/** How long a session is held while she is away. Longer than the 20 minute
 *  hold plus the time it takes to put the phone down and pick it up again. */
export const RESUME_WINDOW_MS = 30 * 60 * 1000;

export type RoughMsg = { id: number; who: 'me' | 'app'; text: string };

export type RoughSnapshot = {
  messages: RoughMsg[];
  chips: string[];
  dot: 1 | 2 | 3 | 4 | 5;
  keep: KeepCard | null;
  pill: DayPill | null;
  compact: CompactState;
  step: RoughStep;
  msgCount: number;
  nextId: number;
  lightLogged: boolean;
  savedAt: number;
};

// The only copy. Module scope, so it survives an unmount and a background, and
// dies with the JS runtime. Never exported directly — always via take(), which
// enforces the window.
let held: RoughSnapshot | null = null;

/** Detaches the snapshot from the caller's state. The screen happens to replace
 *  its arrays rather than mutate them, but the module holding her session
 *  should not depend on the caller keeping that up. */
export function saveSession(snap: Omit<RoughSnapshot, 'savedAt'>): void {
  held = {
    ...snap,
    messages: snap.messages.map((m) => ({ ...m })),
    chips: [...snap.chips],
    keep: snap.keep ? { ...snap.keep } : null,
    pill: snap.pill ? { ...snap.pill } : null,
    compact: { ...snap.compact },
    savedAt: Date.now(),
  };
}

/** The held session if it is still inside the window, else null. Expired
 *  sessions are dropped here rather than lingering until the next save. */
export function takeSession(now: number = Date.now()): RoughSnapshot | null {
  if (!held) return null;
  if (now - held.savedAt > RESUME_WINDOW_MS) {
    held = null;
    return null;
  }
  return held;
}

/** Explicit end: she closed it, or finished it, or was away too long. */
export function clearSession(): void {
  held = null;
}
