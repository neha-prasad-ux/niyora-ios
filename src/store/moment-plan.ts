import AsyncStorage from '@react-native-async-storage/async-storage';

// Moves she chose to do LATER in the in-the-moment flow, parked for Today.
//
// When she taps "Later" on the act she picked, the move is saved here and an
// "Added to today" snackbar confirms it, instead of the flow dumping her onto
// the Today tab. On-device only, like the rest of the PMS state.
//
// NOTE: nothing renders these on the Today tab yet — that surface is the
// follow-up. Saving here first keeps the data real so the snackbar is honest
// and the Today row can read it when it is built.

export type PlannedAction = {
  /** YYYY-MM-DD it was planned for. */
  date: string;
  /** The act label she chose, e.g. "Take something off my plate". */
  label: string;
  /** ISO timestamp, so the newest can sort first. */
  at: string;
};

const STORAGE_KEY = 'niyora:moment-plan';
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function parsePlannedActions(raw: string | null): PlannedAction[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p.filter(
      (a): a is PlannedAction =>
        a != null &&
        typeof a.label === 'string' &&
        typeof a.date === 'string' &&
        YMD.test(a.date) &&
        typeof a.at === 'string',
    );
  } catch {
    return [];
  }
}

export async function getPlannedActions(): Promise<PlannedAction[]> {
  return parsePlannedActions(await AsyncStorage.getItem(STORAGE_KEY));
}

/** Save a move for Today. Returns the day it was filed under. */
export async function addPlannedAction(label: string): Promise<string> {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const existing = await getPlannedActions();
  const next: PlannedAction[] = [
    { date, label, at: now.toISOString() },
    ...existing,
  ].slice(0, 50);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return date;
}
