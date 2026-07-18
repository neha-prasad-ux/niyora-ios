// Serialize read-modify-write cycles per storage key.
//
// Every append store here follows the same shape: read the whole array from
// AsyncStorage, push/mutate in JS, write it back. Two of those running at once
// (a background HR-tick firing a nudge while a foreground answer is being
// written; light earned from two flows landing together) interleave their
// get→set and the second write silently clobbers the first — losing an event
// from a log that is meant to be the system's ground truth.
//
// withStoreLock chains all work for a given key onto a single promise, so each
// read-modify-write runs to completion before the next begins. Different keys
// never block each other (independent chains), and a task that throws never
// wedges the chain — the next task still runs.

const chains = new Map<string, Promise<unknown>>();

export function withStoreLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve();
  // Run `task` after the previous work settles, whatever its outcome.
  const run = prev.then(task, task);
  // The stored tail must never reject, or it would poison every future caller.
  chains.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}
