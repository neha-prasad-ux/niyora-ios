import type { CheckInRecord } from '@/store/checkin-history';
import type { MoodRecord } from '@/store/mood-history';
import type { SessionRecord } from '@/store/session-history';
import { TECHNIQUES, isBreathing, type BreathingTechnique } from '@/models/techniques';

export type Emotion =
  | 'anxious'
  | 'frustrated'
  | 'lonely'
  | 'helpless'
  | 'overwhelmed'
  | 'scattered';

// Science-based emotion -> technique map.
// Primary: best evidence fit. Fallback: always an unlocked technique.
//   anxious/stressed  -> Wind Down (4-7-8: long exhale activates parasympathetic)
//   frustrated/"hot"  -> Cooling Breath (locked) / Box Breath
//   lonely            -> Bring Someone to Mind / Be Kind to Yourself
//   helpless          -> Five Senses (body grounding)
//   overwhelmed       -> Five Senses / Box (grounding then regulated rhythm)
//   scattered         -> Alternate Nostril (locked) / Box (focused bilateral rhythm)
const EMOTION_TECHNIQUE: Record<Emotion, { primary: string; fallback: string }> = {
  anxious:     { primary: 'wind-down',         fallback: 'belly' },
  frustrated:  { primary: 'cooling',           fallback: 'box' },
  lonely:      { primary: 'bring-someone',     fallback: 'be-kind' },
  helpless:    { primary: 'five-senses',       fallback: 'belly' },
  overwhelmed: { primary: 'five-senses',       fallback: 'box' },
  scattered:   { primary: 'alternate-nostril', fallback: 'box' },
};

// Rated sessions needed before personalization overrides the science default.
const PERSONALIZATION_THRESHOLD = 5;

function meanMood(techniqueId: string, moods: readonly MoodRecord[]): number {
  const relevant = moods.filter((m) => m.techniqueId === techniqueId);
  if (relevant.length === 0) return 0;
  return relevant.reduce((sum, m) => sum + m.mood, 0) / relevant.length;
}

// How many rounds of a breathing technique fit within targetSeconds.
// Result is clamped to [1, technique.rounds].
export function roundsForTarget(technique: BreathingTechnique, targetSeconds: number): number {
  const perRound = technique.phases.reduce((s, p) => s + p.duration, 0);
  if (perRound <= 0) return technique.rounds;
  return Math.max(1, Math.min(Math.floor(targetSeconds / perRound), technique.rounds));
}

export type RecommendationSource = 'personalized' | 'emotion' | 'history-hint' | 'fallback';

export type Recommendation = {
  techniqueId: string;
  rounds: number | null; // null = use the technique's own default
  source: RecommendationSource;
};

export function recommend(opts: {
  moods: readonly MoodRecord[];
  checkins: readonly CheckInRecord[];
  sessions: readonly SessionRecord[];
  emotion?: Emotion;
  targetSeconds?: number;
}): Recommendation {
  const { moods, checkins, emotion, targetSeconds } = opts;
  const unlocked = TECHNIQUES.filter((t) => !t.locked);

  let candidateId = 'box'; // always-unlocked cold-start default
  let source: RecommendationSource = 'fallback';

  // Personalization: highest-rated technique wins once threshold is met.
  if (moods.length >= PERSONALIZATION_THRESHOLD) {
    let best: { id: string; score: number } | null = null;
    for (const t of unlocked) {
      const score = meanMood(t.id, moods);
      if (score > 0 && (!best || score > best.score)) {
        best = { id: t.id, score };
      }
    }
    if (best) {
      candidateId = best.id;
      source = 'personalized';
    }
  }

  // Science hint from today's check-in when below the personalization threshold.
  if (source === 'fallback') {
    const today = new Date().toDateString();
    const todayCheckin = checkins
      .slice()
      .reverse()
      .find((c) => new Date(c.recordedAt).toDateString() === today);
    if (todayCheckin?.level === 'heavy') {
      candidateId = 'belly';
      source = 'history-hint';
    }
  }

  // Emotion always overrides — the user just expressed what they need right now.
  if (emotion) {
    const { primary, fallback } = EMOTION_TECHNIQUE[emotion];
    const primaryAvailable = unlocked.some((t) => t.id === primary);
    candidateId = primaryAvailable ? primary : fallback;
    source = 'emotion';
  }

  const technique = unlocked.find((t) => t.id === candidateId) ?? unlocked[0];
  let rounds: number | null = null;
  if (targetSeconds != null && isBreathing(technique)) {
    const r = roundsForTarget(technique, targetSeconds);
    if (r !== technique.rounds) rounds = r;
  }

  return { techniqueId: technique.id, rounds, source };
}
