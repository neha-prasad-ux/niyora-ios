import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'niyora:streak-freezes';
export const FREEZE_INTERVAL = 7; // consecutive days of effective streak per freeze earned

export type FreezeState = {
  available: number;
  appliedDates: string[]; // YYYY-MM-DD dates where a freeze bridged a missed day
};

function defaultState(): FreezeState {
  return { available: 0, appliedDates: [] };
}

export async function readFreezeState(): Promise<FreezeState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        available: typeof parsed.available === 'number' ? parsed.available : 0,
        appliedDates: Array.isArray(parsed.appliedDates) ? parsed.appliedDates : [],
      };
    }
  } catch {}
  return defaultState();
}

async function writeFreezeState(state: FreezeState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function getAvailableFreezes(): Promise<number> {
  return (await readFreezeState()).available;
}

// Record that dates were covered by a freeze and decrement available accordingly.
// Skips dates already in appliedDates (idempotent).
export async function applyFreezesToDates(dates: string[]): Promise<void> {
  if (dates.length === 0) return;
  const state = await readFreezeState();
  const newDates = dates.filter((d) => !state.appliedDates.includes(d));
  if (newDates.length === 0) return;
  state.appliedDates = [...state.appliedDates, ...newDates];
  state.available = Math.max(0, state.available - newDates.length);
  await writeFreezeState(state);
}

// Add earned freeze credits.
export async function awardFreezes(count: number): Promise<void> {
  if (count <= 0) return;
  const state = await readFreezeState();
  state.available += count;
  await writeFreezeState(state);
}
