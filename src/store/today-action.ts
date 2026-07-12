import AsyncStorage from '@react-native-async-storage/async-storage';

// Tiny memory for the Now tab's coached action: which action was shown last
// (so the selector can rotate instead of repeating), and whether today's
// check-in ask was dismissed (so "Not yet" quiets it until tomorrow). Stays
// entirely on device, like the rest of the PMS state.

export type TodayActionMemory = {
  last: { date: string; id: string } | null; // the action shown most recently
  dismissedDate: string | null; // YYYY-MM-DD the check-in ask was dismissed for
};

const STORAGE_KEY = 'niyora:today-action';

export const EMPTY_TODAY_ACTION_MEMORY: TodayActionMemory = {
  last: null,
  dismissedDate: null,
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

// Pure parse so junk storage degrades to an empty memory (tested without UI).
export function parseTodayActionMemory(raw: string | null): TodayActionMemory {
  if (!raw) return EMPTY_TODAY_ACTION_MEMORY;
  try {
    const p = JSON.parse(raw) as Partial<TodayActionMemory>;
    const last =
      p.last != null &&
      typeof p.last === 'object' &&
      typeof p.last.date === 'string' &&
      YMD.test(p.last.date) &&
      typeof p.last.id === 'string'
        ? { date: p.last.date, id: p.last.id }
        : null;
    const dismissedDate =
      typeof p.dismissedDate === 'string' && YMD.test(p.dismissedDate) ? p.dismissedDate : null;
    return { last, dismissedDate };
  } catch {
    return EMPTY_TODAY_ACTION_MEMORY;
  }
}

export async function getTodayActionMemory(): Promise<TodayActionMemory> {
  return parseTodayActionMemory(await AsyncStorage.getItem(STORAGE_KEY));
}

export async function recordShownAction(date: string, id: string): Promise<void> {
  const memory = await getTodayActionMemory();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...memory, last: { date, id } }));
}

export async function dismissForDay(date: string): Promise<void> {
  const memory = await getTodayActionMemory();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...memory, dismissedDate: date }));
}
