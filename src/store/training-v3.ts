import AsyncStorage from '@react-native-async-storage/async-storage';

// Training progress for the V3 emotion-training game. On-device only, like the
// rest of the PMS state. Holds the wave meter's skill (its steadiness), which
// levels she has completed, and how many kind-word beats she has taken. The
// game nudges skill up as she finishes reps; the dashboard reads it back for the
// compact wave strip. Nothing here leaves the phone.

export type TrainingState = {
  skill: number; // 0..10, the wave's steadiness / meter band
  completed: string[]; // completed level ids (e.g. 'irr-l1')
  kindWords: number; // count of kind-word beats taken
  lastCompletedOn?: string; // local YYYY-MM-DD of the most recent level completion
};

const STORAGE_KEY = 'niyora:training-v3';

export const SEED_SKILL = 3; // "Finding your footing" at the start
export const MAX_SKILL = 10;
export const LEVEL_SKILL_GAIN = 0.7; // a completed level nudges the water steadier

export const DEFAULT_TRAINING: TrainingState = {
  skill: SEED_SKILL,
  completed: [],
  kindWords: 0,
};

function clampSkill(n: unknown): number {
  const v = typeof n === 'number' ? n : NaN;
  if (Number.isNaN(v)) return SEED_SKILL;
  return Math.max(0, Math.min(MAX_SKILL, v));
}

export function parseTraining(raw: string | null): TrainingState {
  if (!raw) return DEFAULT_TRAINING;
  try {
    const p = JSON.parse(raw) as Partial<TrainingState>;
    return {
      skill: clampSkill(p.skill),
      completed: Array.isArray(p.completed)
        ? p.completed.filter((x): x is string => typeof x === 'string')
        : [],
      kindWords:
        typeof p.kindWords === 'number' && p.kindWords >= 0 ? Math.floor(p.kindWords) : 0,
      ...(typeof p.lastCompletedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.lastCompletedOn)
        ? { lastCompletedOn: p.lastCompletedOn }
        : {}),
    };
  } catch {
    return DEFAULT_TRAINING;
  }
}

// Completing a level records it once and nudges the wave steadier. Re-completing
// is a no-op for the list and the skill, so repeats never inflate progress —
// but it still stamps the local day: on all-trained build days the Now tab's
// coached ask is a replay, and the ring closes on that stamp.
export function applyLevelComplete(
  state: TrainingState,
  levelId: string,
  gain = LEVEL_SKILL_GAIN,
  on?: string,
): TrainingState {
  if (state.completed.includes(levelId)) {
    return on != null ? { ...state, lastCompletedOn: on } : state;
  }
  return {
    ...state,
    completed: [...state.completed, levelId],
    skill: clampSkill(state.skill + gain),
    ...(on != null ? { lastCompletedOn: on } : {}),
  };
}

export function applyKindWord(state: TrainingState): TrainingState {
  return { ...state, kindWords: state.kindWords + 1 };
}

export async function getTraining(): Promise<TrainingState> {
  return parseTraining(await AsyncStorage.getItem(STORAGE_KEY));
}

export async function saveTraining(state: TrainingState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Convenience mutators that read, apply, and persist in one call.
export async function recordLevelComplete(levelId: string): Promise<TrainingState> {
  const next = applyLevelComplete(await getTraining(), levelId, LEVEL_SKILL_GAIN, localYmd());
  await saveTraining(next);
  return next;
}

function localYmd(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export async function recordKindWord(): Promise<TrainingState> {
  const next = applyKindWord(await getTraining());
  await saveTraining(next);
  return next;
}
