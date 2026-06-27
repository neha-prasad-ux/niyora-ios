import AsyncStorage from '@react-native-async-storage/async-storage';

// What she tends to feel before her period, chosen once during PMS onboarding.
// Opt-in (default none): she taps what shows up, so it can seed which relief
// the distress loop reaches for first. Stays on device, like the other PMS
// stores. The five names match the in-app feeling set (see RecommendSheet).
export type PmsSymptomId = 'irritable' | 'anxious' | 'low' | 'foggy' | 'overwhelmed';

export type PmsSymptoms = Record<PmsSymptomId, boolean>;

// Display order on the symptom step, and the canonical key list parsing walks.
export const PMS_SYMPTOM_IDS: readonly PmsSymptomId[] = [
  'irritable',
  'anxious',
  'low',
  'foggy',
  'overwhelmed',
];

export const PMS_SYMPTOM_LABELS: Record<PmsSymptomId, string> = {
  irritable: 'Irritable',
  anxious: 'Anxious',
  low: 'Low',
  foggy: 'Foggy',
  overwhelmed: 'Overwhelmed',
};

// Nothing pre-selected: she opts in to what she feels.
export const DEFAULT_PMS_SYMPTOMS: PmsSymptoms = {
  irritable: false,
  anxious: false,
  low: false,
  foggy: false,
  overwhelmed: false,
};

const STORAGE_KEY = 'niyora:pms-symptoms';

export function parsePmsSymptoms(raw: string | null): PmsSymptoms {
  if (!raw) return { ...DEFAULT_PMS_SYMPTOMS };
  try {
    const parsed = JSON.parse(raw) as Partial<Record<PmsSymptomId, unknown>>;
    if (parsed == null || typeof parsed !== 'object') return { ...DEFAULT_PMS_SYMPTOMS };
    // Build key-by-key: a missing key defaults to false (opt-in), unknown keys
    // are dropped, non-true values coerce to false.
    const out = {} as PmsSymptoms;
    for (const id of PMS_SYMPTOM_IDS) {
      out[id] = parsed[id] === true;
    }
    return out;
  } catch {
    return { ...DEFAULT_PMS_SYMPTOMS };
  }
}

export async function getPmsSymptoms(): Promise<PmsSymptoms> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parsePmsSymptoms(raw);
}

export async function setPmsSymptoms(symptoms: PmsSymptoms): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(symptoms));
}
