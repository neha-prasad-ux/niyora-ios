// Per-key serialization for AsyncStorage read-modify-write sequences.
//
// AsyncStorage reads/writes are async, so two callers that each do
// get -> parse -> mutate -> set can interleave: both read the same snapshot,
// both append, and the second set clobbers the first — a silently lost write.
// JS here is single-threaded, so we don't need a real lock; chaining each
// task for a given key onto the previous one's completion is enough to make
// every critical section run start-to-finish before the next begins.
//
// Group every operation that touches the same storage key under that key so
// they queue against each other.

const chains = new Map<string, Promise<unknown>>();

export function withStoreLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve();
  // Run `task` once the previous task settles, whether it resolved or rejected,
  // so one failure never wedges the queue.
  const run = prev.then(task, task);
  // The stored tail swallows errors and resolves to void: it only marks "the
  // queue is now free", never propagates a failure to the next caller.
  const tail = run.then(
    () => undefined,
    () => undefined,
  );
  chains.set(key, tail);
  // Once this is the last task in the queue, drop the entry so the map can't
  // grow without bound over the app's lifetime.
  tail.then(() => {
    if (chains.get(key) === tail) chains.delete(key);
  });
  return run;
}
