import AsyncStorage from '@react-native-async-storage/async-storage';

// The areas she lets Niyora help with, chosen during PMS onboarding. Three
// groups that fold in the six underlying levers: calm (stress + gentle
// movement), sleep, and food (steady meals + calcium + anti-inflammatory).
// All start on (default-in, opt-out): she taps to remove what she doesn't want.
// Stays entirely on device; it only decides which content surfaces later.
export type PmsFactorId = 'calm' | 'sleep' | 'food';

export type PmsFactors = Record<PmsFactorId, boolean>;

// Display order on the factor page. Also the canonical key list parsing walks,
// so a stored object missing a key still resolves to the default for that key.
export const PMS_FACTOR_IDS: readonly PmsFactorId[] = ['calm', 'sleep', 'food'];

// All on by default: onboarding pre-selects every card and she opts out.
export const DEFAULT_PMS_FACTORS: PmsFactors = {
  calm: true,
  sleep: true,
  food: true,
};

// The action-framed label + the one-line "why" shown on each card. Lives here so
// onboarding, the week page, and a future profile editor read one source.
// Concrete and honest: no "imbalance", no overclaims, never "leaky gut".
export const PMS_FACTOR_CONTENT: Record<PmsFactorId, { label: string; why: string }> = {
  calm: {
    label: 'Activities to calm you down',
    why: 'For the stress and tension that hit hardest before your period.',
  },
  sleep: {
    label: 'Activities to help you sleep',
    why: 'Short sleep before your period sharpens every other symptom.',
  },
  food: {
    label: 'Food ideas for PMS',
    why: 'Helps steady your blood sugar and ease the dip, gently.',
  },
};

const STORAGE_KEY = 'niyora:pms-factors';

export function parsePmsFactors(raw: string | null): PmsFactors {
  if (!raw) return { ...DEFAULT_PMS_FACTORS };
  try {
    const parsed = JSON.parse(raw) as Partial<Record<PmsFactorId, unknown>>;
    if (parsed == null || typeof parsed !== 'object') return { ...DEFAULT_PMS_FACTORS };
    // Build key-by-key so unknown keys are dropped and a missing key defaults to
    // true: the opt-out invariant (anything not explicitly removed stays on).
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
