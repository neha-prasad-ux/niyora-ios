import AsyncStorage from '@react-native-async-storage/async-storage';

// Smart PMS mode preferences. Set once during onboarding (or later in My Soul)
// and never asked again. Stays entirely on device: the date and cycle length
// only feed the local window prediction in lib/pms-window, nothing is ever sent
// off the phone. When pmsMode is off, the app behaves identically for everyone.
export type PmsPrefs = {
  pmsMode: boolean;
  lastPeriodStart: string | null; // YYYY-MM-DD, local calendar day; null until set
  cycleLength: number; // days; defaults to 28 when unknown
};

const STORAGE_KEY = 'niyora:pms';

export const DEFAULT_CYCLE_LENGTH = 28;
export const MIN_CYCLE_LENGTH = 20;
export const MAX_CYCLE_LENGTH = 40;

export const DEFAULT_PMS_PREFS: PmsPrefs = {
  pmsMode: false,
  lastPeriodStart: null,
  cycleLength: DEFAULT_CYCLE_LENGTH,
};

function clampCycle(value: unknown): number {
  const n = typeof value === 'number' ? Math.round(value) : NaN;
  if (Number.isNaN(n) || n < MIN_CYCLE_LENGTH || n > MAX_CYCLE_LENGTH) {
    return DEFAULT_CYCLE_LENGTH;
  }
  return n;
}

function validDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function parsePmsPrefs(raw: string | null): PmsPrefs {
  if (!raw) return DEFAULT_PMS_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<PmsPrefs>;
    return {
      pmsMode: parsed.pmsMode === true,
      lastPeriodStart: validDate(parsed.lastPeriodStart),
      cycleLength: clampCycle(parsed.cycleLength),
    };
  } catch {
    return DEFAULT_PMS_PREFS;
  }
}

export async function getPmsPrefs(): Promise<PmsPrefs> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parsePmsPrefs(raw);
}

export async function setPmsPrefs(prefs: PmsPrefs): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
