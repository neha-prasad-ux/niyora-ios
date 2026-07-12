import AsyncStorage from '@react-native-async-storage/async-storage';

// Per-cycle impact reads — the other axis of the You tab's effort-vs-impact
// chart. At each period boundary the Now tab asks, per life domain, how the
// cycle that just ended actually landed (rough / okay / fine). Effort (light,
// engaged days) answers "how much did she meet the app"; this answers "did it
// help, and where". One entry per cycle, anchored to the cycle's start (the
// same anchor remission-log uses), so a cycle is rated once. On device only.
//
// The Now tab owns the asking (when, tone, the "don't ask this" mute); this
// store is the shared contract — the Now flow writes with recordCycleImpact /
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

function toYmd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Record one domain's read for a cycle. Merges into any existing entry for
 * that cycle (she can rate work now and her partner a day later), and a later
 * read for the same domain overwrites the earlier one. Called by the Now flow.
 */
export async function recordCycleImpact(
  cycleAnchor: string,
  domain: ImpactDomain,
  level: ImpactLevel,
  now: Date = new Date(),
): Promise<CycleImpactEntry[]> {
  if (!YMD.test(cycleAnchor)) return getCycleImpacts();
  const log = await getCycleImpacts();
  const at = toYmd(now);
  const existing = log.find((e) => e.cycleAnchor === cycleAnchor);
  if (existing) {
    existing.reads[domain] = level;
    existing.at = at;
  } else {
    log.push({ cycleAnchor, reads: { [domain]: level }, at });
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  return log;
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
