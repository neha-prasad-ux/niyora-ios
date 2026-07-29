import AsyncStorage from '@react-native-async-storage/async-storage';

import { withStoreLock } from './storage-lock';

// A reset-proof, additive record of Steady-yourself completions (ported from
// V2's distress-history). The count only ever goes up ("23 times you came back
// to yourself"), never a streak that can break. The before/after feel-ratings
// are kept so a later wave can personalise which tools surface first, and so the
// relief screen can scale its line to the real shift. Stays entirely on device.
export type SteadyEntry = {
  what: string | null; // the "what happened" id (snapped/cried/...), or null
  before: number; // 1..5 feel-rating before the calming steps
  after: number; // 1..5 feel-rating after the flow
  at: string; // ISO-8601 timestamp
};

export type SteadyState = {
  count: number; // additive lifetime completions, never decreases
  entries: SteadyEntry[]; // most recent last, capped
};

const STORAGE_KEY = 'niyora:steady-history';
const MAX_ENTRIES = 50;

export const EMPTY_STEADY_STATE: SteadyState = { count: 0, entries: [] };

function clampRating(v: unknown): number {
  const n = typeof v === 'number' ? Math.round(v) : NaN;
  if (Number.isNaN(n) || n < 1) return 1;
  if (n > 5) return 5;
  return n;
}

function parseEntry(raw: unknown): SteadyEntry | null {
  if (raw == null || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.at !== 'string') return null;
  return {
    what: typeof e.what === 'string' ? e.what : null,
    before: clampRating(e.before),
    after: clampRating(e.after),
    at: e.at,
  };
}

export function parseSteadyState(raw: string | null): SteadyState {
  if (!raw) return { count: 0, entries: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<SteadyState>;
    if (parsed == null || typeof parsed !== 'object') return { count: 0, entries: [] };
    const entries = Array.isArray(parsed.entries)
      ? parsed.entries.map(parseEntry).filter((e): e is SteadyEntry => e !== null)
      : [];
    const rawCount = typeof parsed.count === 'number' ? Math.floor(parsed.count) : 0;
    // The count can never be below the entries we can see, and never negative.
    const count = Math.max(0, rawCount, entries.length);
    return { count, entries: entries.slice(-MAX_ENTRIES) };
  } catch {
    return { count: 0, entries: [] };
  }
}

export async function getSteadyState(): Promise<SteadyState> {
  return parseSteadyState(await AsyncStorage.getItem(STORAGE_KEY));
}

// Record one completed flow: bump the additive count and append the entry.
// Returns the new state so the relief screen can show the fresh count.
export async function addSteadyEntry(entry: SteadyEntry): Promise<SteadyState> {
  return withStoreLock(STORAGE_KEY, async () => {
    const current = await getSteadyState();
    const next: SteadyState = {
      count: current.count + 1,
      entries: [...current.entries, entry].slice(-MAX_ENTRIES),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  });
}
