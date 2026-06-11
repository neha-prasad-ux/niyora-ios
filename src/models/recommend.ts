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
  short: string; // mindfulness technique id
  long: string; // breathing technique id
  // Which path the ~1 min option takes for this feeling. Agitation and
  // body-tension feelings get a fast breath even in a minute (a minute is
  // plenty for a few rounds); scattered/heavy/good get a grounding or
  // savouring mindful reset, where a breath would feel like a fix-it.
  oneMin: 'short' | 'long';
};

// Desired feelings ("How do you want to feel?"). Each maps to the technique
// that produces it: `short` is a mindfulness practice, `long` a breathing one.
// Every id below exists in TECHNIQUES.
export const FEELINGS: readonly Feeling[] = [
  { id: 'calm', label: 'Calm', short: 'soft-gaze', long: 'box', oneMin: 'long' },
  { id: 'grounded', label: 'Grounded', short: 'five-senses', long: 'belly', oneMin: 'short' },
  { id: 'sleepy', label: 'Sleepy', short: 'let-it-drift', long: 'wind-down', oneMin: 'long' },
  { id: 'focused', label: 'Focused', short: 'soft-gaze', long: 'alternate-nostril', oneMin: 'long' },
  { id: 'clear', label: 'Clear', short: 'let-it-drift', long: 'box', oneMin: 'short' },
  { id: 'kind', label: 'Kind to myself', short: 'be-kind', long: 'belly', oneMin: 'short' },
  { id: 'safe', label: 'Safe', short: 'hold-yourself', long: 'box', oneMin: 'short' },
  { id: 'connected', label: 'Connected', short: 'bring-someone', long: 'ocean', oneMin: 'short' },
  { id: 'cool', label: 'Cool', short: 'soft-gaze', long: 'cooling', oneMin: 'long' },
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
  // The feeling the user picked, carried through so the post-session save can
  // close the loop (emotion -> recommendation -> impact).
  feelingId: string;
};

// Map a feeling + chosen duration to a concrete technique (and rounds for the
// breathing path). Returns null if the feeling is unknown or the mapped
// technique is missing from the catalogue.
export function recommend(feelingId: string, minutes: number): Recommendation | null {
  const feeling = getFeeling(feelingId);
  if (!feeling) return null;

  // ~1 min: the path is curated per feeling. A 'short' feeling plays its
  // mindfulness practice as authored; a 'long' feeling runs its breath, scaled
  // down to fit the minute (a minute still holds a few rounds).
  if (minutes <= 1) {
    if (feeling.oneMin === 'short') {
      const t = getTechnique(feeling.short);
      return t ? { techniqueId: t.id, feelingId: feeling.id } : null;
    }
    const t = getTechnique(feeling.long);
    if (!t) return null;
    return { techniqueId: t.id, rounds: scaleRounds(t, 60), feelingId: feeling.id };
  }

  // Longer path: breathing, rounds scaled to the target.
  const t = getTechnique(feeling.long);
  if (!t) return null;
  return { techniqueId: t.id, rounds: scaleRounds(t, minutes * 60), feelingId: feeling.id };
}

// "Wanna try another?" picks the OTHER technique for the same feeling (if they
// just did the breath, offer the mindful one, and vice versa) so the next try
// stays on goal but feels different. Plays at the authored length. Returns null
// when there is no feeling context (e.g. a session reached from the picker),
// in which case the caller should fall back to asking the feeling again.
export function alternate(
  feelingId: string | undefined,
  currentTechniqueId: string,
): Recommendation | null {
  if (!feelingId) return null;
  const feeling = getFeeling(feelingId);
  if (!feeling) return null;
  const otherId = currentTechniqueId === feeling.long ? feeling.short : feeling.long;
  const t = getTechnique(otherId);
  if (!t) return null;
  return isBreathing(t)
    ? { techniqueId: t.id, rounds: t.rounds, feelingId: feeling.id }
    : { techniqueId: t.id, feelingId: feeling.id };
}
