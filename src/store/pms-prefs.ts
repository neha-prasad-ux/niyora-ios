import AsyncStorage from '@react-native-async-storage/async-storage';

// Smart PMS mode preferences. Set once during onboarding (or later in My Soul)
// and never asked again. Stays entirely on device: the date and cycle length
// only feed the local window prediction in lib/pms-window, nothing is ever sent
// off the phone. When pmsMode is off, the app behaves identically for everyone.
// Which entry point she picked at the end of onboarding (the "where do you want
// to start?" grid). Lets the Grow tab lead with that pillar. Null until chosen.
export type StartedWith = 'emotion' | 'workplace' | 'partner' | 'story';

export type PmsPrefs = {
  pmsMode: boolean;
  lastPeriodStart: string | null; // YYYY-MM-DD, local calendar day; null until set
  cycleLength: number; // days; defaults to 28 when unknown
  // How many days a period lasts. Only shapes the calendar range she sees, never
  // the window math. Optional so older saved prefs (and onboarding's own writes)
  // still parse; reads fall back to DEFAULT_PERIOD_LENGTH.
  periodLength?: number;
  startedWith?: StartedWith | null; // onboarding "start here" pick; null until chosen
};

const STORAGE_KEY = 'niyora:pms';

export const DEFAULT_CYCLE_LENGTH = 28;
export const MIN_CYCLE_LENGTH = 20;
export const MAX_CYCLE_LENGTH = 40;

// Period (bleeding) length: only shapes the calendar range she sees, not the
// window math. Ported from production V2. One value for every period.
export const DEFAULT_PERIOD_LENGTH = 5;
export const MIN_PERIOD_LENGTH = 2;
export const MAX_PERIOD_LENGTH = 8;

export function clampPeriodLength(value: unknown): number {
  const n = typeof value === 'number' ? Math.round(value) : NaN;
  if (Number.isNaN(n) || n < MIN_PERIOD_LENGTH || n > MAX_PERIOD_LENGTH) {
    return DEFAULT_PERIOD_LENGTH;
  }
  return n;
}

export const DEFAULT_PMS_PREFS: PmsPrefs = {
  pmsMode: false,
  lastPeriodStart: null,
  cycleLength: DEFAULT_CYCLE_LENGTH,
  periodLength: DEFAULT_PERIOD_LENGTH,
  startedWith: null,
};

const STARTED_WITH_VALUES: StartedWith[] = ['emotion', 'workplace', 'partner', 'story'];

function parseStartedWith(value: unknown): StartedWith | null {
  return typeof value === 'string' && (STARTED_WITH_VALUES as string[]).includes(value)
    ? (value as StartedWith)
    : null;
}

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
      periodLength: clampPeriodLength(parsed.periodLength),
      startedWith: parseStartedWith(parsed.startedWith),
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
