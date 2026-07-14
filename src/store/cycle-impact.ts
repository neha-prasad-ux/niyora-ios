import AsyncStorage from '@react-native-async-storage/async-storage';

// Per-cycle impact reads — the other axis of the You tab's effort-vs-impact
// chart. At each period boundary the Now tab asks, per life domain, how the
// cycle that just ended actually landed (rough / okay / fine). Effort (light,
// engaged days) answers "how much did she meet the app"; this answers "did it
// help, and where". Append-only: she can look back on a cycle more than once,
// each reflection a new timestamped entry. The chart folds the log to the
// latest read per domain per cycle (latestReadsByAnchor). On device only.
//
// The Now tab owns the asking (when, tone, the "don't ask this" mute); this
// store is the shared contract — the Reflect flow writes with appendCycleImpact /
// setDomainMuted, the You tab reads with getCycleImpacts / getMutedDomains.

export type ImpactDomain = 'work' | 'partner' | 'yourself';

// rough (1) < okay (2) < fine (3): a small absolute read each cycle, shown to
// her as the comparison. Absolute (not a raw delta) so the chart has a stable
// line and the first cycle still plots.
export type ImpactLevel = 1 | 2 | 3;

export const IMPACT_DOMAINS: readonly ImpactDomain[] = ['work', 'partner', 'yourself'];

export const IMPACT_DOMAIN_LABEL: Record<ImpactDomain, string> = {
  work: 'Work',
  partner: 'Partner',
  yourself: 'Yourself',
};

export type CycleImpactEntry = {
  cycleAnchor: string; // the cycle's start (YYYY-MM-DD) this read belongs to
  reads: Partial<Record<ImpactDomain, ImpactLevel>>;
  at: string; // local YYYY-MM-DD the read was given
};

const STORAGE_KEY = 'niyora:cycle-impact';
const MUTED_KEY = 'niyora:cycle-impact-muted';

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const LEVELS: readonly ImpactLevel[] = [1, 2, 3];

function parseReads(v: unknown): Partial<Record<ImpactDomain, ImpactLevel>> {
  if (v == null || typeof v !== 'object') return {};
  const out: Partial<Record<ImpactDomain, ImpactLevel>> = {};
  for (const d of IMPACT_DOMAINS) {
    const lvl = (v as Record<string, unknown>)[d];
    if (typeof lvl === 'number' && LEVELS.includes(lvl as ImpactLevel)) {
      out[d] = lvl as ImpactLevel;
    }
  }
  return out;
}

// Pure parse so junk storage degrades to an empty log.
export function parseCycleImpact(raw: string | null): CycleImpactEntry[] {
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (e): e is CycleImpactEntry =>
          e != null &&
          typeof e === 'object' &&
          typeof (e as CycleImpactEntry).cycleAnchor === 'string' &&
          YMD.test((e as CycleImpactEntry).cycleAnchor),
      )
      .map((e) => ({
        cycleAnchor: e.cycleAnchor,
        reads: parseReads(e.reads),
        at: typeof e.at === 'string' ? e.at : '',
      }));
  } catch {
    return [];
  }
}

export async function getCycleImpacts(): Promise<CycleImpactEntry[]> {
  return parseCycleImpact(await AsyncStorage.getItem(STORAGE_KEY));
}

/**
 * Append one reflection's impact reads for a cycle. Every reflection stacks a
 * new entry (she can look back more than once); nothing is overwritten. `at` is
 * an ISO timestamp so same-day reflections still order. A read with no valid
 * domains, or a malformed anchor, is a no-op.
 */
export async function appendCycleImpact(
  cycleAnchor: string,
  reads: Partial<Record<ImpactDomain, ImpactLevel>>,
  at: string,
): Promise<CycleImpactEntry[]> {
  const clean = parseReads(reads);
  if (!YMD.test(cycleAnchor) || Object.keys(clean).length === 0) return getCycleImpacts();
  const log = await getCycleImpacts();
  log.push({ cycleAnchor, reads: clean, at });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  return log;
}

/**
 * Fold the append-only log to one reads map per cycle for the chart: walking
 * oldest → newest, a later reflection overwrites the domains it re-rates but
 * never erases a domain it left out.
 */
export function latestReadsByAnchor(
  log: readonly CycleImpactEntry[],
): Map<string, Partial<Record<ImpactDomain, ImpactLevel>>> {
  const sorted = [...log].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const map = new Map<string, Partial<Record<ImpactDomain, ImpactLevel>>>();
  for (const e of sorted) {
    map.set(e.cycleAnchor, { ...(map.get(e.cycleAnchor) ?? {}), ...e.reads });
  }
  return map;
}

/**
 * The reads from her most recent reflection of any cycle — the ghost "last
 * time" marker a fresh reflection is compared against.
 */
export function lastImpactReads(
  log: readonly CycleImpactEntry[],
): Partial<Record<ImpactDomain, ImpactLevel>> | null {
  let latest: CycleImpactEntry | null = null;
  for (const e of log) {
    if (latest == null || e.at > latest.at) latest = e;
  }
  return latest?.reads ?? null;
}

// The domains she has muted ("don't ask this"). The Now tab stops asking; the
// You tab hides the chip and its line. Kept as a simple global preference — a
// mute holds across cycles until she turns it back on.
export function parseMutedDomains(raw: string | null): ImpactDomain[] {
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return IMPACT_DOMAINS.filter((d) => arr.includes(d));
  } catch {
    return [];
  }
}

export async function getMutedDomains(): Promise<ImpactDomain[]> {
  return parseMutedDomains(await AsyncStorage.getItem(MUTED_KEY));
}

export async function setDomainMuted(domain: ImpactDomain, muted: boolean): Promise<ImpactDomain[]> {
  const current = new Set(await getMutedDomains());
  if (muted) current.add(domain);
  else current.delete(domain);
  const next = IMPACT_DOMAINS.filter((d) => current.has(d));
  await AsyncStorage.setItem(MUTED_KEY, JSON.stringify(next));
  return next;
}
