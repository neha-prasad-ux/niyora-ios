// User-initiated "recommend me based on how I feel" flow. Fully on-device:
// the user taps how she feels, then what she needs, and we rank the whole
// library (breathing + mindfulness techniques AND the lighter activities) into
// a hero + ordered list. No history, no soul-state, nothing leaves the phone.
//
// Two gates: feeling, then need (the need step is pre-filled from the primary
// feeling, so it's barely a gate). Time is NOT a third question -- it filters
// the activities and scales the breathing downstream (on the result page).

import { getTechnique, isBreathing, type Technique } from './techniques';
import { ACTIVITIES, type PmsFeeling } from './activities';

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

// The need axis: the felt state she's reaching for ("How do you want to feel?").
// Destinations, not clinical directions -- foggy reaches for focused, a wired
// night reaches for sleepy, a tearful low reaches for cozy (comfort, never a
// forced "lift").
export type Need = 'calm' | 'focused' | 'relaxed' | 'sleepy' | 'cozy' | 'let-it-out';

export type NeedOption = { id: Need; label: string };

export const NEEDS: readonly NeedOption[] = [
  { id: 'calm', label: 'Calm' },
  { id: 'focused', label: 'Focused' },
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'cozy', label: 'Cozy' },
  { id: 'let-it-out', label: 'Let it out' },
];

// Pre-fill the need step from the primary feeling, so it's barely a gate: the
// default is already lit, she taps through or changes it in one tap.
export const FEELING_NEED_DEFAULT: Record<PmsFeeling, Need> = {
  anxious: 'calm',
  irritable: 'relaxed',
  low: 'cozy',
  foggy: 'focused',
  overwhelmed: 'calm',
};

export function defaultNeedFor(feelingId: string): Need | undefined {
  return FEELING_NEED_DEFAULT[feelingId as PmsFeeling];
}

// Duration choices, in minutes. Time is no longer a question gate; these back
// the result page's "got longer?" toggle.
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

// Which needs each library item serves. Activities are keyed by id; techniques
// by id too (only the feeling-mapped ones are reachable from this flow). These
// are the `serves`/outcome tags the need axis re-ranks against.
const ACTIVITY_NEEDS: Record<string, readonly Need[]> = {
  'cold-water': ['calm'],
  'make-something-warm': ['cozy', 'calm'],
  'slow-walk': ['relaxed', 'focused'],
  'legs-up-the-wall': ['sleepy', 'relaxed'],
  'childs-pose': ['relaxed', 'calm'],
  'slow-stretches': ['relaxed'],
  'warm-to-eat': ['cozy', 'focused'],
  'get-it-out': ['let-it-out'],
  'park-it': ['calm', 'let-it-out'],
  'gentle-read': ['cozy', 'calm'],
  'something-light': ['cozy', 'relaxed'],
  'one-tiny-thing': ['focused', 'calm'],
  'bridge-back': ['let-it-out', 'calm'],
  'cave-mode': ['cozy', 'sleepy'],
};

const TECHNIQUE_NEEDS: Record<string, readonly Need[]> = {
  'be-kind': ['calm', 'cozy'],
  cooling: ['calm', 'relaxed'],
  'five-senses': ['calm', 'focused'],
  'wind-down': ['calm', 'sleepy'],
  'hold-yourself': ['cozy', 'calm'],
  belly: ['calm', 'relaxed'],
  'alternate-nostril': ['focused', 'calm'],
  'soft-gaze': ['calm', 'relaxed'],
  ocean: ['calm', 'sleepy'],
};

// One library item, normalized so techniques and activities can mix in a single
// ranked list (the data model in niyora-pms-activities.md). The launch payload
// differs by source: technique cards carry techniqueId (+ scaled rounds for the
// breathing path); activity cards carry activityId.
export type RecCard = {
  id: string;
  source: 'technique' | 'activity';
  title: string;
  feelings: readonly PmsFeeling[]; // feelings it serves
  needs: readonly Need[]; // needs it serves
  timeSeconds: number; // 0 = instant or open-ended
  fast: boolean; // under a minute, hero-eligible for a quick pick
  score: number; // match strength for the current query
  techniqueId?: string;
  rounds?: number; // breathing: scaled to the chosen time
  activityId?: string;
  feelingId?: string; // primary feeling carried for session loop-closing
};

export type RecResult = {
  hero: RecCard;
  list: readonly RecCard[]; // everything below the hero, ordered
  feelingIds: readonly string[];
  needIds: readonly Need[];
};

// Which feelings a technique serves, derived from the FEELINGS map (a technique
// serves feeling F if it is F.short or F.long).
function techniqueFeelings(techniqueId: string): readonly PmsFeeling[] {
  return FEELINGS.filter((f) => f.short === techniqueId || f.long === techniqueId).map(
    (f) => f.id as PmsFeeling,
  );
}

// The static candidate set, before any query. Techniques reachable from the
// feeling map plus all activities, each normalized to a RecCard (score filled
// in per query).
function buildCandidates(): RecCard[] {
  const techIds = Object.keys(TECHNIQUE_NEEDS);
  const techCards: RecCard[] = techIds
    .map((id): RecCard | null => {
      const t = getTechnique(id);
      if (!t) return null;
      return {
        id: `tech-${id}`,
        source: 'technique' as const,
        title: t.name,
        feelings: techniqueFeelings(id),
        needs: TECHNIQUE_NEEDS[id],
        timeSeconds: t.durationSeconds,
        fast: false,
        score: 0,
        techniqueId: id,
      };
    })
    .filter((c): c is RecCard => c !== null);

  const actCards: RecCard[] = ACTIVITIES.map((a) => ({
    id: `act-${a.id}`,
    source: 'activity' as const,
    title: a.title,
    feelings: a.fits,
    needs: ACTIVITY_NEEDS[a.id] ?? [],
    timeSeconds: a.timeSeconds,
    fast: a.fast,
    score: 0,
    activityId: a.id,
  }));

  return [...techCards, ...actCards];
}

// Rank the whole library for a set of selected feelings + needs, returning a
// hero + ordered list. Score is the UNION count: how many of the selected
// feelings and needs the card serves (more matches rank higher).
//
// `minutes` is optional. Omit it (the result page does) to show every option at
// its own authored time -- the time on each card is what the user reads to
// decide, so there is no time gate. Pass it to constrain by a budget: activities
// longer than it drop out (instant/open ones always stay) and breathing scales
// to fit. Returns null only if no primary feeling is given.
export function recommend(
  feelings: readonly string[],
  needs: readonly Need[],
  minutes?: number,
): RecResult | null {
  const primaryId = feelings[0];
  if (!primaryId) return null;

  const hasBudget = typeof minutes === 'number';
  const budgetSeconds = hasBudget ? Math.max(60, minutes * 60) : 0;
  const feelingSet = new Set(feelings);
  const needSet = new Set(needs);

  const ranked = buildCandidates()
    .map((c) => {
      const feelHits = c.feelings.filter((f) => feelingSet.has(f)).length;
      const needHits = c.needs.filter((n) => needSet.has(n)).length;
      const card: RecCard = { ...c, score: feelHits + needHits, feelingId: primaryId };
      // Breathing carries rounds: scaled to the budget when one is set, else its
      // authored length (which is also the time shown on the card).
      if (card.source === 'technique' && card.techniqueId) {
        const t = getTechnique(card.techniqueId);
        if (t && isBreathing(t)) {
          card.rounds = hasBudget ? scaleRounds(t, budgetSeconds) : t.rounds;
          if (hasBudget) card.timeSeconds = budgetSeconds;
        }
      }
      return card;
    })
    // Keep relevant cards. With a budget, drop activities that can't fit it
    // (timeSeconds 0 = instant/open, always eligible); without one, keep all.
    .filter((c) => c.score > 0)
    .filter((c) => !hasBudget || c.source === 'technique' || c.timeSeconds === 0 || c.timeSeconds <= budgetSeconds)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Same score: prefer items serving the PRIMARY feeling.
      const aPrim = a.feelings.includes(primaryId as PmsFeeling) ? 1 : 0;
      const bPrim = b.feelings.includes(primaryId as PmsFeeling) ? 1 : 0;
      if (bPrim !== aPrim) return bPrim - aPrim;
      // For short budgets, a fast pick wins; otherwise prefer the shorter item.
      if (b.fast !== a.fast) return Number(b.fast) - Number(a.fast);
      return a.timeSeconds - b.timeSeconds;
    });

  // Fallback: if nothing matched (shouldn't happen, need is pre-filled), route
  // to the primary feeling's breathing practice so she always lands somewhere.
  if (ranked.length === 0) {
    const feeling = getFeeling(primaryId);
    const t = feeling ? getTechnique(feeling.long) : undefined;
    if (!t) return null;
    const hero: RecCard = {
      id: `tech-${t.id}`,
      source: 'technique',
      title: t.name,
      feelings: techniqueFeelings(t.id),
      needs: TECHNIQUE_NEEDS[t.id] ?? [],
      timeSeconds: hasBudget ? budgetSeconds : t.durationSeconds,
      fast: false,
      score: 0,
      techniqueId: t.id,
      rounds: hasBudget ? scaleRounds(t, budgetSeconds) : isBreathing(t) ? t.rounds : undefined,
      feelingId: primaryId,
    };
    return { hero, list: [], feelingIds: feelings, needIds: needs };
  }

  const [hero, ...list] = ranked;
  return { hero, list, feelingIds: feelings, needIds: needs };
}

// The first technique card in a result, used to launch a real session in the
// interim before the result page (and the activity experience screens) exist.
export function firstTechnique(result: RecResult): RecCard | undefined {
  if (result.hero.source === 'technique') return result.hero;
  return result.list.find((c) => c.source === 'technique');
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
