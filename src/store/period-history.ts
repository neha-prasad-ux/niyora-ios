import AsyncStorage from '@react-native-async-storage/async-storage';

import { withStoreLock } from './storage-lock';

// A stored history of logged period start dates (YYYY-MM-DD), newest first.
//
// This is ADDITIVE to pms-prefs: pms-prefs keeps only the single most-recent
// start that the window prediction reads (lib/pms-window), and every existing
// consumer (My Soul, luteal card, reminders) keeps reading that unchanged. This
// history just remembers the extra past periods she logs during onboarding, so
// nothing is lost, without changing the single-period prediction model. On
// device only, like the rest of the PMS state.
const KEY = 'niyora:period-history';

const isYmd = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

// Newest first, deduped.
function normalize(starts: string[]): string[] {
  return Array.from(new Set(starts.filter(isYmd))).sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0,
  );
}

export async function getPeriodHistory(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? normalize(arr) : [];
  } catch {
    return [];
  }
}

export async function setPeriodHistory(starts: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(normalize(starts)));
}

/** Add one start to the stored history and return the new list (newest first). */
export async function addPeriodStart(start: string): Promise<string[]> {
  return withStoreLock(KEY, async () => {
    const next = normalize([start, ...(await getPeriodHistory())]);
    await setPeriodHistory(next);
    return next;
  });
}

/** The most recent logged start, or null. */
export function latestStart(starts: string[]): string | null {
  return normalize(starts)[0] ?? null;
}
