// The summary line on the review screen: her feelings, and whether they land in
// one phase. Lives here, not in the screen, so it can be tested without pulling
// the whole React Native render tree in.

import type { BandPhase, Excerpt } from './therapist-export-types';

const PHASE_LABEL: Record<BandPhase, string> = {
  build: 'build days',
  pms: 'PMS days',
  period: 'period days',
};

// The one thing a clinician reads first: what she felt, and whether it lands in
// one phase. Phase picked by count, not hardcoded to PMS, so a period-heavy
// record says so. Feelings are counted inside that phase only, otherwise the
// tally is just her overall mood and shows no pattern at all.
export function summarise(shown: readonly Excerpt[]): string {
  if (shown.length === 0) return '';
  const top = tally(shown.map((e) => e.phase).filter((ph): ph is BandPhase => ph != null))[0];
  const inPhase = top ? shown.filter((e) => e.phase === top.key) : shown;
  const feelings = tally(inPhase.map((e) => e.feeling))
    .map((f) => `${f.key} (${f.n})`)
    .join(', ');
  return [top ? `${top.n} on ${PHASE_LABEL[top.key as BandPhase]}` : '', feelings]
    .filter(Boolean)
    .join(' · ');
}

/** Counted, most-named first. Her labels, never re-grouped. */
function tally(keys: readonly string[]): { key: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  return [...counts].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n);
}
