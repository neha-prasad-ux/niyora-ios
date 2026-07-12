import AsyncStorage from '@react-native-async-storage/async-storage';

// One remission answer per cycle: after her period starts, the Now tab asks
// whether symptoms eased. Onboarding asked this once; logging it every cycle
// turns a single self-report into a pattern the You tab can show. Each entry
// anchors to the lastPeriodStart it answers for, so a cycle is asked once.
// Stays entirely on device.

export type RemissionAnswer = 'yes' | 'soft' | 'no';

export type RemissionEntry = {
  cycleAnchor: string; // the lastPeriodStart (YYYY-MM-DD) this answer belongs to
  answer: RemissionAnswer;
  at: string; // local YYYY-MM-DD the answer was given
};

const STORAGE_KEY = 'niyora:remission-log';

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const ANSWERS: readonly RemissionAnswer[] = ['yes', 'soft', 'no'];

// Pure parse so junk storage degrades to an empty log.
export function parseRemissionLog(raw: string | null): RemissionEntry[] {
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (e): e is RemissionEntry =>
        e != null &&
        typeof e === 'object' &&
        typeof (e as RemissionEntry).cycleAnchor === 'string' &&
        YMD.test((e as RemissionEntry).cycleAnchor) &&
        ANSWERS.includes((e as RemissionEntry).answer) &&
        typeof (e as RemissionEntry).at === 'string',
    );
  } catch {
    return [];
  }
}

export async function getRemissionLog(): Promise<RemissionEntry[]> {
  return parseRemissionLog(await AsyncStorage.getItem(STORAGE_KEY));
}

export async function appendRemission(entry: RemissionEntry): Promise<void> {
  const log = await getRemissionLog();
  log.push(entry);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

export function answeredForCycle(log: RemissionEntry[], cycleAnchor: string | null): boolean {
  if (cycleAnchor == null) return false;
  return log.some((e) => e.cycleAnchor === cycleAnchor);
}
