import AsyncStorage from '@react-native-async-storage/async-storage';

// The Periods-care checklist: soothing things she can tick off on the heavy
// days. Ticks are per-day and live entirely on device, a gentle list, not a
// score, and (unlike the PMS-prep ticks) they earn no light, because the period
// is the rest phase, not a grind. Keyed by local YMD.

export type PeriodsCareDay = { date: string; done: string[] };

const STORAGE_KEY = 'niyora:periods-care';
const YMD = /^\d{4}-\d{2}-\d{2}$/;

// Pure parse so junk storage degrades to an empty log.
export function parsePeriodsCare(raw: string | null): PeriodsCareDay[] {
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (e): e is PeriodsCareDay =>
          e != null &&
          typeof e === 'object' &&
          typeof (e as PeriodsCareDay).date === 'string' &&
          YMD.test((e as PeriodsCareDay).date),
      )
      .map((e) => ({
        date: e.date,
        done: Array.isArray(e.done) ? e.done.filter((x): x is string => typeof x === 'string') : [],
      }));
  } catch {
    return [];
  }
}

async function getAll(): Promise<PeriodsCareDay[]> {
  return parsePeriodsCare(await AsyncStorage.getItem(STORAGE_KEY));
}

/** The ids ticked on a given day (empty when nothing has been ticked yet). */
export async function getPeriodsCare(date: string): Promise<string[]> {
  const all = await getAll();
  return all.find((e) => e.date === date)?.done ?? [];
}

/** Toggle one item for the day, returning the day's ticked ids afterwards. */
export async function togglePeriodsCare(date: string, id: string): Promise<string[]> {
  if (!YMD.test(date)) return getPeriodsCare(date);
  const all = await getAll();
  const idx = all.findIndex((e) => e.date === date);
  const cur = idx >= 0 ? all[idx].done : [];
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  if (idx >= 0) all[idx] = { date, done: next };
  else all.push({ date, done: next });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return next;
}
