import AsyncStorage from '@react-native-async-storage/async-storage';

import { withStoreLock } from './with-store-lock';

// A reset-proof, additive record of distress-loop completions. The count only
// ever goes up ("23 reflections moved through"), never a streak that can break.
// The before/after feel-ratings are kept so a later wave can personalise which
// tools surface first. Stays on device.
export type DistressEntry = {
  feeling: string | null; // a PMS feeling id, or null for "something feels off"
  before: number; // 1..5 feel-rating before the calming activity
  after: number; // 1..5 feel-rating after the loop
  completedAt: string; // ISO timestamp
};

export type DistressState = {
  count: number; // additive lifetime completions
  entries: DistressEntry[]; // most recent last, capped
};

const STORAGE_KEY = 'niyora:distress-history';
const MAX_ENTRIES = 50;

export const EMPTY_DISTRESS_STATE: DistressState = { count: 0, entries: [] };

function clampRating(v: unknown): number {
  const n = typeof v === 'number' ? Math.round(v) : NaN;
  if (Number.isNaN(n) || n < 1) return 1;
  if (n > 5) return 5;
  return n;
}

function parseEntry(raw: unknown): DistressEntry | null {
  if (raw == null || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.completedAt !== 'string') return null;
  return {
    feeling: typeof e.feeling === 'string' ? e.feeling : null,
    before: clampRating(e.before),
    after: clampRating(e.after),
    completedAt: e.completedAt,
  };
}

export function parseDistressState(raw: string | null): DistressState {
  if (!raw) return { count: 0, entries: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<DistressState>;
    if (parsed == null || typeof parsed !== 'object') return { count: 0, entries: [] };
    const entries = Array.isArray(parsed.entries)
      ? parsed.entries.map(parseEntry).filter((e): e is DistressEntry => e !== null)
      : [];
    const rawCount = typeof parsed.count === 'number' ? Math.floor(parsed.count) : 0;
    // Count can never be below the entries we can see, and never negative.
    const count = Math.max(0, rawCount, entries.length);
    return { count, entries: entries.slice(-MAX_ENTRIES) };
  } catch {
    return { count: 0, entries: [] };
  }
}

export async function getDistressState(): Promise<DistressState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseDistressState(raw);
}

// Record one completed loop: bump the additive count and append the entry.
// Returns the new state so the done screen can show the fresh count.
export async function addDistressEntry(entry: DistressEntry): Promise<DistressState> {
  return withStoreLock(STORAGE_KEY, async () => {
    const current = await getDistressState();
    const next: DistressState = {
      count: current.count + 1,
      entries: [...current.entries, entry].slice(-MAX_ENTRIES),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  });
}
