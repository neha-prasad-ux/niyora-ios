// PMS preparedness scoring — a readiness *estimate*, not a completion bar.
// See docs/pms/niyora-pms-preparedness-spec.md (v2). The score answers "how
// likely am I to cope well this cycle", so it must never reach 100%: you cannot
// fully prepare for something unpredictable.
//
// Model: prepared = 1 − Π(1 − c) over each prep action done. Every action chips
// away at the "unprepared" remainder, each one adds a little less than the last
// (diminishing returns), and the curve approaches — never reaches — a ceiling.
//
// This is the buildable slice: contributions come from the existing readiness
// checklist + the day's calm session. Pillar-weighted contributions (Aware /
// Nourish / Calm / Together) layer in here as that content lands.

import { readinessDoneCount, type ReadinessChecks } from '@/store/pms-readiness';

// Per-action contribution to readiness. Tuned so a fully-kept checklist lands in
// the high 80s and the ceiling caps just below "done" — the empty sliver is the
// message ("the rest you meet in the moment").
const PER_ACTION = 0.28;
// Display ceiling: the score never renders at or above this, so it never reads
// as 100% / finished.
export const PREP_CEILING = 0.9;

// prepared = 1 − (1 − PER_ACTION)^doneCount, clamped to the ceiling.
export function preparednessScore(checks: ReadinessChecks, calmDone: boolean): number {
  const done = readinessDoneCount(checks, calmDone);
  const remainder = Math.pow(1 - PER_ACTION, done);
  return Math.min(PREP_CEILING, 1 - remainder);
}

// The band ladder is the hero; the raw number is not surfaced. The top rung
// praises effort, it never claims completion — keeping the never-100 honesty warm.
export const PREP_BANDS = [
  { min: 0.85, label: 'You are doing great' },
  { min: 0.68, label: 'Well prepared' },
  { min: 0.45, label: 'Half way' },
  { min: 0.2, label: 'A little' },
  { min: 0, label: 'Getting started' },
] as const;

export function prepBand(score: number): string {
  return (PREP_BANDS.find((b) => score >= b.min) ?? PREP_BANDS[PREP_BANDS.length - 1]).label;
}
