// User-initiated "recommend me based on how I feel" flow. Fully on-device:
// the user taps a feeling and a duration, and we map that to a technique.
// No history, no soul-state, nothing leaves the phone -- this is a pure
// lookup over the static technique catalogue.
//
// Duration is the switch between practice kinds:
//   ~1 min  -> the feeling's short mindfulness practice (plays as authored)
//   ~3/~5 min -> the feeling's breathing practice, rounds scaled to the
//               target duration.

import { getTechnique, isBreathing, type Technique } from './techniques';

// Scenario-framed feelings shown as chips. `short` is a mindfulness technique
// id; `long` is a breathing technique id. Both must exist in TECHNIQUES.
export type Feeling = {
  id: string;
  label: string;
  short: string; // mindfulness technique id (~1 min path)
  long: string; // breathing technique id (~3/~5 min path)
};

export const FEELINGS: readonly Feeling[] = [
  { id: 'tense', label: 'Tense', short: 'soft-gaze', long: 'wind-down' },
  { id: 'restless', label: 'Restless', short: 'let-it-drift', long: 'box' },
  { id: 'frustrated', label: 'Frustrated', short: 'soft-gaze', long: 'cooling' },
  { id: 'scattered', label: 'Scattered', short: 'five-senses', long: 'alternate-nostril' },
  { id: 'heavy', label: 'Heavy', short: 'be-kind', long: 'belly' },
  { id: 'overwhelmed', label: 'Overwhelmed', short: 'five-senses', long: 'ocean' },
  { id: 'good', label: 'Good', short: 'bring-someone', long: 'ocean' },
];

// Duration choices, in minutes. 1 min routes to mindfulness; longer routes to
// breathing with scaled rounds.
export type DurationOption = { minutes: number; label: string };

export const DURATIONS: readonly DurationOption[] = [
  { minutes: 1, label: '~1 min' },
  { minutes: 3, label: '~3 min' },
  { minutes: 5, label: '~5 min' },
];

export function getFeeling(id: string): Feeling | undefined {
  return FEELINGS.find((f) => f.id === id);
}

// Scale a breathing technique's rounds to hit a target duration. We keep the
// per-round cadence fixed (the authored phase timings) and only change how
// many rounds run. Always at least 1 round.
export function scaleRounds(technique: Technique, targetSeconds: number): number {
  if (!isBreathing(technique) || technique.rounds <= 0) return 1;
  const secondsPerRound = technique.durationSeconds / technique.rounds;
  if (secondsPerRound <= 0) return technique.rounds;
  return Math.max(1, Math.round(targetSeconds / secondsPerRound));
}

export type Recommendation = {
  techniqueId: string;
  // Present only for the breathing path; undefined means "play as authored".
  rounds?: number;
};

// Map a feeling + chosen duration to a concrete technique (and rounds for the
// breathing path). Returns null if the feeling is unknown or the mapped
// technique is missing from the catalogue.
export function recommend(feelingId: string, minutes: number): Recommendation | null {
  const feeling = getFeeling(feelingId);
  if (!feeling) return null;

  // Short path: play the mindfulness practice as authored.
  if (minutes <= 1) {
    const t = getTechnique(feeling.short);
    return t ? { techniqueId: t.id } : null;
  }

  // Longer path: breathing, rounds scaled to the target.
  const t = getTechnique(feeling.long);
  if (!t) return null;
  return { techniqueId: t.id, rounds: scaleRounds(t, minutes * 60) };
}
