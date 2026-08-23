import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_ANSWERS, type V3Answers } from '@/v3/v3-content';

// Every completed PMS read: the onboarding's answers, stamped with the day she
// finished. Additive and oldest-first, so [0] is her baseline and the last
// entry is where she stands now, the pair the "then vs. now" compare reads.
// The first read is recorded when onboarding completes; retakes append.
// Stays entirely on device, like the rest of the PMS state.
export type PmsRead = {
  at: string; // local YYYY-MM-DD, matching lib/pms-window's day math
  answers: V3Answers;
};

const KEY = 'niyora:pms-reads';

// Pure parse so junk storage degrades to "no reads" (tested without the UI).
export function parsePmsReads(raw: string | null): PmsRead[] {
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r): r is { at: string; answers?: Partial<V3Answers> } => {
        return r != null && typeof (r as { at?: unknown }).at === 'string';
      })
      .map((r) => ({ at: r.at, answers: { ...EMPTY_ANSWERS, ...(r.answers ?? {}) } }));
  } catch {
    return [];
  }
}

export async function getPmsReads(): Promise<PmsRead[]> {
  return parsePmsReads(await AsyncStorage.getItem(KEY));
}

export async function addPmsRead(read: PmsRead): Promise<void> {
  const all = await getPmsReads();
  all.push(read);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}
