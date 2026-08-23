// The load card's pure content: the buckets, the copy, and the line under the
// sorted list.
//
// Split out from load-card.tsx 2026-08-23, for the same reason fill-in-assemble.ts
// sits beside fill-in.tsx. The component imports ThinkingDots, which pulls
// Reanimated, so a test that only wanted to check one sentence booted native
// Worklets and took the whole suite down in CI. None of this needs a renderer.

export type LoadBucket = 'today' | 'wait' | 'notMine';

export const LOAD_COPY = {
  addTitle: 'What is actually on you right now?',
  addWhy: 'One line each. Big or small, it all counts.',
  placeholder: 'The thing you keep remembering',
  add: 'Add',
  next: 'Continue',
  sortTitle: 'Which of these are really yours today?',
  sortWhy: 'Tap each one.',
  today: 'Today',
  wait: 'Can wait',
  notMine: 'Not mine',
  done: 'Done',
  // Deliberately not "here is what I noticed". The finding belongs to her list,
  // not to us.
  readsHead: 'What your list shows',
} as const;

/**
 * What we say once she has sorted. Counts only, no comfort and no conclusion:
 * the intervention already happened when the fog became a list, and a closing
 * reassurance would take the finding off her.
 */
export function loadResult(counts: Record<LoadBucket, number>): string {
  const total = counts.today + counts.wait + counts.notMine;
  if (total === 0) return '';
  const parts = [`${total} ${total === 1 ? 'thing' : 'things'}.`];
  if (counts.today) parts.push(`${counts.today} for today.`);
  if (counts.wait) parts.push(`${counts.wait} can wait.`);
  if (counts.notMine) parts.push(`${counts.notMine} not yours to carry.`);
  return parts.join(' ');
}
