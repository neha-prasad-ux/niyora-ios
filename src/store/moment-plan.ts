import AsyncStorage from '@react-native-async-storage/async-storage';

import { localYmd } from '../lib/day';

// Moves she chose to do LATER in the in-the-moment flow, parked for Today.
//
// When she taps "Later" on the act she picked, the move is saved here and an
// "Added to today" snackbar confirms it, instead of the flow dumping her onto
// the Today tab. On-device only, like the rest of the PMS state.
//
// NOTE: nothing renders these on the Today tab yet, that surface is the
// follow-up. Saving here first keeps the data real so the snackbar is honest
// and the Today row can read it when it is built.

export type PlannedAction = {
  /** YYYY-MM-DD it was planned for. */
  date: string;
  /** The act label she chose, e.g. "Take something off my plate". */
  label: string;
  /** ISO timestamp, so the newest can sort first. Also the stable key. */
  at: string;
  /** ISO time she set a reminder for, if any (set from the Moon home list). */
  remindAt?: string;
  /** The message/plan she (or the moon) drafted, so tapping it on the home can
   *  reopen the exact task she saved, not just its label. */
  draft?: string;
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

/** Save a move for Today. `draft` is the text she/the moon composed, kept so the
 *  home list can reopen the exact task. Returns the day it was filed under. */
export async function addPlannedAction(
  label: string,
  draft?: string,
  remindAt?: string,
): Promise<string> {
  const now = new Date();
  const date = localYmd(now);
  const existing = await getPlannedActions();
  const next: PlannedAction[] = [
    {
      date,
      label,
      at: now.toISOString(),
      ...(draft ? { draft } : {}),
      ...(remindAt ? { remindAt } : {}),
    },
    ...existing,
  ].slice(0, 50);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return date;
}

/** Set (or change) the reminder time on a planned move, keyed by its `at`. */
export async function setPlannedReminder(at: string, remindAt: string): Promise<void> {
  const list = await getPlannedActions();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(list.map((a) => (a.at === at ? { ...a, remindAt } : a))),
  );
}

/** Remove a planned move (she did it, or dropped it), keyed by its `at`. */
export async function removePlannedAction(at: string): Promise<void> {
  const list = await getPlannedActions();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list.filter((a) => a.at !== at)));
}
