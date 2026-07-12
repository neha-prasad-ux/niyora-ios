import AsyncStorage from '@react-native-async-storage/async-storage';

// The awareness half of the cycle-end reflection (the Now tab's Reflect flow).
// Where cycle-impact records *how the cycle landed* per life domain and
// remission-log records *whether symptoms eased*, this records the metacognition
// beats: did she notice the change, did she right-size her response, and what
// she'd manage better next time. One entry per cycle, anchored to the cycle's
// start (the same anchor cycle-impact and remission use), so a cycle is asked
// once and a later answer overwrites the earlier one. On device only.

// The levers she can pick from "what could you manage better next time" — the
// same handful the prep checklist coaches, so reflection points back at action.
export type ManageLever = 'nutrition' | 'sleep' | 'emotions';

export const MANAGE_LEVERS: readonly ManageLever[] = ['nutrition', 'sleep', 'emotions'];

export const MANAGE_LEVER_LABEL: Record<ManageLever, string> = {
  nutrition: 'Eating calcium-rich food',
  sleep: 'Sleeping on time',
  emotions: 'Managing emotions',
};

export type ReflectEntry = {
  cycleAnchor: string; // the lastPeriodStart (YYYY-MM-DD) this reflection answers for
  noticedChange: boolean; // "did you recognise the emotional change this time?"
  rightSized: boolean; // "did you recognise the size and choose the next step?"
  manageBetter: ManageLever[]; // multi-select; may be empty ("nothing / not sure")
  at: string; // local YYYY-MM-DD the reflection was given
};

const STORAGE_KEY = 'niyora:reflect-log';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function parseLevers(v: unknown): ManageLever[] {
  if (!Array.isArray(v)) return [];
  return MANAGE_LEVERS.filter((l) => v.includes(l));
}

// Pure parse so junk storage degrades to an empty log.
export function parseReflectLog(raw: string | null): ReflectEntry[] {
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (e): e is ReflectEntry =>
          e != null &&
          typeof e === 'object' &&
          typeof (e as ReflectEntry).cycleAnchor === 'string' &&
          YMD.test((e as ReflectEntry).cycleAnchor) &&
          typeof (e as ReflectEntry).noticedChange === 'boolean' &&
          typeof (e as ReflectEntry).rightSized === 'boolean' &&
          typeof (e as ReflectEntry).at === 'string',
      )
      .map((e) => ({ ...e, manageBetter: parseLevers(e.manageBetter) }));
  } catch {
    return [];
  }
}

export async function getReflectLog(): Promise<ReflectEntry[]> {
  return parseReflectLog(await AsyncStorage.getItem(STORAGE_KEY));
}

/**
 * Record (or overwrite) the reflection for a cycle. Deduped by anchor, so
 * re-reflecting the same cycle replaces the earlier answer rather than stacking.
 */
export async function recordReflect(entry: ReflectEntry): Promise<ReflectEntry[]> {
  if (!YMD.test(entry.cycleAnchor)) return getReflectLog();
  const log = await getReflectLog();
  const next = [...log.filter((e) => e.cycleAnchor !== entry.cycleAnchor), entry];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/** Whether this cycle has already been reflected on (dedupe the ask). */
export function reflectedForCycle(log: ReflectEntry[], cycleAnchor: string | null): boolean {
  return cycleAnchor != null && log.some((e) => e.cycleAnchor === cycleAnchor);
}
