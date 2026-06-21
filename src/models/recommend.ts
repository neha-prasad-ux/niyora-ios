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

// PMS current-state feelings ("How are you feeling?"). Each maps to the
// technique that helps with it: `short` is a mindfulness practice, `long` a
// breathing one. Every id below exists in TECHNIQUES.
export const FEELINGS: readonly Feeling[] = [
  { id: 'irritable', label: 'Irritable', short: 'be-kind', long: 'cooling', oneMin: 'long' },
  { id: 'anxious', label: 'Anxious', short: 'five-senses', long: 'wind-down', oneMin: 'long' },
  { id: 'low', label: 'Low', short: 'hold-yourself', long: 'belly', oneMin: 'short' },
  { id: 'foggy', label: 'Foggy', short: 'five-senses', long: 'alternate-nostril', oneMin: 'short' },
  { id: 'overwhelmed', label: 'Overwhelmed', short: 'soft-gaze', long: 'ocean', oneMin: 'long' },
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
  // The primary feeling, carried through so the post-session save can close
  // the loop (emotion -> recommendation -> impact). Absent when the session
  // was not reached via a feeling (e.g. the picker or "try another" fallback).
  feelingId?: string;
  // All feelings selected in multi-select (first = primary = feelingId).
  // Only present when the caller passed an array to recommend().
  feelingIds?: readonly string[];
};

// Map a feeling (or ordered set of feelings) + chosen duration to a concrete
// technique (and rounds for the breathing path). When an array is passed the
// first element is the primary; extras refine ranking context but do not
// change which technique is selected. Returns null if the primary feeling is
// unknown, the array is empty, or the mapped technique is missing.
export function recommend(
  feelingIdOrIds: string | readonly string[],
  minutes: number,
): Recommendation | null {
  const ids: readonly string[] =
    typeof feelingIdOrIds === 'string' ? [feelingIdOrIds] : feelingIdOrIds;
  const primaryId = ids[0];
  if (!primaryId) return null;

  const feeling = getFeeling(primaryId);
  if (!feeling) return null;

  // Only attach feelingIds when the caller passed an array (multi-select path).
  const multiCtx =
    typeof feelingIdOrIds !== 'string' ? { feelingIds: ids } : undefined;

  // ~1 min: the path is curated per feeling. A 'short' feeling plays its
  // mindfulness practice as authored; a 'long' feeling runs its breath, scaled
  // down to fit the minute (a minute still holds a few rounds).
  if (minutes <= 1) {
    if (feeling.oneMin === 'short') {
      const t = getTechnique(feeling.short);
      return t ? { techniqueId: t.id, feelingId: feeling.id, ...multiCtx } : null;
    }
    const t = getTechnique(feeling.long);
    if (!t) return null;
    return { techniqueId: t.id, rounds: scaleRounds(t, 60), feelingId: feeling.id, ...multiCtx };
  }

  // Longer path: breathing, rounds scaled to the target.
  const t = getTechnique(feeling.long);
  if (!t) return null;
  return { techniqueId: t.id, rounds: scaleRounds(t, minutes * 60), feelingId: feeling.id, ...multiCtx };
}

// Gentle go-to practices used when "try another" has no feeling context (the
// session came from the picker or first-run). First one that isn't the one just
// done is offered.
const FALLBACK_ALTERNATES = ['belly', 'five-senses', 'box'] as const;

function asRecommendation(t: Technique, feelingId?: string): Recommendation {
  return isBreathing(t)
    ? { techniqueId: t.id, rounds: t.rounds, feelingId }
    : { techniqueId: t.id, feelingId };
}

// "Wanna try another?" offers a DIFFERENT practice than the one just finished.
// With a feeling, it swaps the breath for the mindful practice (or vice versa)
// for that same feeling, so it stays on goal. Without a feeling, it falls back
// to a gentle different go-to. Plays at the authored length.
export function alternate(
  feelingId: string | undefined,
  currentTechniqueId: string,
): Recommendation | null {
  const feeling = feelingId ? getFeeling(feelingId) : undefined;
  if (feeling) {
    const otherId = currentTechniqueId === feeling.long ? feeling.short : feeling.long;
    const t = getTechnique(otherId);
    if (t) return asRecommendation(t, feeling.id);
  }
  const fallbackId =
    FALLBACK_ALTERNATES.find((id) => id !== currentTechniqueId) ?? FALLBACK_ALTERNATES[0];
  const t = getTechnique(fallbackId);
  return t ? asRecommendation(t) : null;
}
