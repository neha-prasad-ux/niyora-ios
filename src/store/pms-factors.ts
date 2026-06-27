import AsyncStorage from '@react-native-async-storage/async-storage';

// The factors she lets Niyora help with, chosen during PMS onboarding. All six
// start on (default-in, opt-out): she taps to remove the ones she doesn't want.
// Stays entirely on device, like pms-prefs; it only decides which prevention
// content surfaces later, nothing is ever sent off the phone. Editable later in
// profile (not in this slice).
export type PmsFactorId =
  | 'stress'
  | 'sleep'
  | 'steadyMeals'
  | 'calcium'
  | 'movement'
  | 'gutInflammation';

export type PmsFactors = Record<PmsFactorId, boolean>;

// Display order on the factor page. Also the canonical key list parsing walks,
// so a stored object missing a key still resolves to the default for that key.
export const PMS_FACTOR_IDS: readonly PmsFactorId[] = [
  'stress',
  'sleep',
  'steadyMeals',
  'calcium',
  'movement',
  'gutInflammation',
];

// All on by default: onboarding pre-selects every card and she opts out.
export const DEFAULT_PMS_FACTORS: PmsFactors = {
  stress: true,
  sleep: true,
  steadyMeals: true,
  calcium: true,
  movement: true,
  gutInflammation: true,
};

// Label + the one-line "why" shown inline on each card. Lives here so the
// future profile editor reads the same source. Concrete names only; never the
// phrase "leaky gut" (it reads as fringe and undercuts the evidence moat).
export const PMS_FACTOR_CONTENT: Record<PmsFactorId, { label: string; why: string }> = {
  stress: {
    label: 'Stress',
    why: 'The big one. Calming a spike in the moment is what Niyora does best.',
  },
  sleep: {
    label: 'Sleep',
    why: 'Short sleep before your period sharpens every other symptom.',
  },
  steadyMeals: {
    label: 'Steady meals',
    why: 'Blood-sugar crashes can mimic the mood dip. Eating steadily softens it.',
  },
  calcium: {
    label: 'Calcium',
    why: 'The mineral with the strongest evidence for easing premenstrual mood.',
  },
  movement: {
    label: 'Movement',
    why: 'Gentle movement lifts mood and lowers the inflammation that amplifies it.',
  },
  gutInflammation: {
    label: 'Gut & inflammation',
    why: 'Calming inflammation (omega-3, fibre, fermented foods, less ultra-processed) takes the edge off.',
  },
};

const STORAGE_KEY = 'niyora:pms-factors';

export function parsePmsFactors(raw: string | null): PmsFactors {
  if (!raw) return { ...DEFAULT_PMS_FACTORS };
  try {
    const parsed = JSON.parse(raw) as Partial<Record<PmsFactorId, unknown>>;
    if (parsed == null || typeof parsed !== 'object') return { ...DEFAULT_PMS_FACTORS };
    // Build key-by-key so unknown keys are dropped and a missing key defaults to
    // true: the opt-out invariant (anything not explicitly removed stays on)
    // also makes this forward-compatible if a new factor is added later.
    const out = {} as PmsFactors;
    for (const id of PMS_FACTOR_IDS) {
      out[id] = parsed[id] === false ? false : true;
    }
    return out;
  } catch {
    return { ...DEFAULT_PMS_FACTORS };
  }
}

export async function getPmsFactors(): Promise<PmsFactors> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parsePmsFactors(raw);
}

export async function setPmsFactors(factors: PmsFactors): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(factors));
}
