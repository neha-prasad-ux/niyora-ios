import AsyncStorage from '@react-native-async-storage/async-storage';

import { learnedCycleLength } from '@/lib/pms-window';

// Smart PMS mode preferences. Set once during onboarding (or later in My Soul)
// and never asked again. Stays entirely on device: the dates and cycle length
// only feed the local window prediction in lib/pms-window, nothing is ever sent
// off the phone. When pmsMode is off, the app behaves identically for everyone.
//
// We keep every period start she logs (periodStarts), not just the latest, so
// the prediction can learn her real cycle length from the gaps between them.
// lastPeriodStart is always the most recent of those dates, kept in sync by the
// helpers below so existing readers don't have to know about the history.
export type PmsPrefs = {
  pmsMode: boolean;
  lastPeriodStart: string | null; // YYYY-MM-DD, local calendar day; null until set
  periodStarts: string[]; // every logged start, sorted ascending; most recent last
  cycleLength: number; // days; her typed estimate, the seed before we learn
  manualCycle: boolean; // true once she sets the length by hand (overrides learning)
};

const STORAGE_KEY = 'niyora:pms';

export const DEFAULT_CYCLE_LENGTH = 28;
export const MIN_CYCLE_LENGTH = 20;
export const MAX_CYCLE_LENGTH = 40;

// Keep a generous but bounded history so storage never grows without limit; two
// years of cycles is far more than the learned average ever looks at.
const MAX_HISTORY = 24;

export const DEFAULT_PMS_PREFS: PmsPrefs = {
  pmsMode: false,
  lastPeriodStart: null,
  periodStarts: [],
  cycleLength: DEFAULT_CYCLE_LENGTH,
  manualCycle: false,
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

// Normalize a list of logged dates: keep only valid YYYY-MM-DD, dedupe, sort
// ascending, and cap to the most recent MAX_HISTORY.
function normalizeHistory(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    const d = validDate(item);
    if (d) seen.add(d);
  }
  return [...seen].sort().slice(-MAX_HISTORY);
}

export function parsePmsPrefs(raw: string | null): PmsPrefs {
  if (!raw) return DEFAULT_PMS_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<PmsPrefs>;
    const legacyLast = validDate(parsed.lastPeriodStart);
    let periodStarts = normalizeHistory(parsed.periodStarts);
    // Migrate older saves that only stored a single lastPeriodStart: seed the
    // history with it so nothing she logged before this version is lost.
    if (periodStarts.length === 0 && legacyLast) periodStarts = [legacyLast];
    const lastPeriodStart = periodStarts.length
      ? periodStarts[periodStarts.length - 1]
      : null;
    return {
      pmsMode: parsed.pmsMode === true,
      lastPeriodStart,
      periodStarts,
      cycleLength: clampCycle(parsed.cycleLength),
      manualCycle: parsed.manualCycle === true,
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

// Insert a freshly logged period start: dedupes, re-sorts, caps the history,
// and points lastPeriodStart at the most recent day. Use this when she reports
// a new period ("my period's here", onboarding, turning the mode on).
export function addPeriodStart(prefs: PmsPrefs, ymd: string): PmsPrefs {
  const valid = validDate(ymd);
  if (!valid) return prefs;
  const periodStarts = normalizeHistory([...prefs.periodStarts, valid]);
  return {
    ...prefs,
    periodStarts,
    lastPeriodStart: periodStarts[periodStarts.length - 1] ?? null,
  };
}

// Correct the most recent logged date in place (replace, don't append), so
// fixing a wrong "last period started" date never invents a phantom cycle.
export function replaceLatestPeriodStart(prefs: PmsPrefs, ymd: string): PmsPrefs {
  const valid = validDate(ymd);
  if (!valid) return prefs;
  const withoutLatest = prefs.periodStarts.slice(0, -1);
  const periodStarts = normalizeHistory([...withoutLatest, valid]);
  return {
    ...prefs,
    periodStarts,
    lastPeriodStart: periodStarts[periodStarts.length - 1] ?? null,
  };
}

// The cycle length the prediction should actually use. Her hand-set value wins
// when she has overridden it; otherwise we use what we learned from her logged
// periods, falling back to her typed estimate until there's enough to learn.
export function effectiveCycleLength(prefs: PmsPrefs): number {
  if (prefs.manualCycle) return prefs.cycleLength;
  return learnedCycleLength(prefs.periodStarts) ?? prefs.cycleLength;
}
