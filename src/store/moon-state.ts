import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  applyMint,
  cyclesKept,
  mintCycleMoon,
  withBrightness,
  withMaterial,
  DEFAULT_MOON_STATE,
  DIM_FLOOR,
  FULLNESS_MAX,
  type LedgerTotals,
  type MintedMoon,
  type MoonMaterial,
  type MoonState,
} from '@/lib/moon-light';
import type { RemissionAnswer } from '@/store/remission-log';
import { withStoreLock } from '@/store/storage-lock';

// The cached fold of the moon reward system (moon-reward-spec.md): current
// brightness (bright by default, dimmed only by fading lessons), lifetime
// material, and the shelf of minted cycles. All transitions are the pure
// functions in lib/moon-light; this store persists them. On device only.

const STORAGE_KEY = 'niyora:moon-state';

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const MATERIALS: readonly MoonMaterial[] = ['moonstone', 'gold', 'opal', 'diamond'];
const CLARITIES: readonly (RemissionAnswer | null)[] = ['yes', 'soft', 'no', null];

function parseYmd(v: unknown): string | null {
  return typeof v === 'string' && YMD.test(v) ? v : null;
}

function parseShelf(v: unknown): MintedMoon[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (m): m is MintedMoon =>
      m != null &&
      typeof m === 'object' &&
      parseYmd((m as MintedMoon).cycleStart) != null &&
      parseYmd((m as MintedMoon).cycleEnd) != null &&
      typeof (m as MintedMoon).fullness === 'number' &&
      CLARITIES.includes((m as MintedMoon).clarity) &&
      MATERIALS.includes((m as MintedMoon).material) &&
      typeof (m as MintedMoon).kept === 'boolean',
  );
}

// Pure parse so junk storage degrades to the default (bright) moon.
export function parseMoonState(raw: string | null): MoonState {
  if (!raw) return DEFAULT_MOON_STATE;
  try {
    const p = JSON.parse(raw) as Partial<MoonState>;
    const fullness =
      typeof p.fullness === 'number' && !Number.isNaN(p.fullness)
        ? Math.max(DIM_FLOOR, Math.min(FULLNESS_MAX, p.fullness))
        : FULLNESS_MAX;
    return {
      fullness,
      material: MATERIALS.includes(p.material as MoonMaterial)
        ? (p.material as MoonMaterial)
        : 'moonstone',
      facets: typeof p.facets === 'number' && p.facets >= 0 ? Math.floor(p.facets) : 0,
      shelf: parseShelf(p.shelf),
    };
  } catch {
    return DEFAULT_MOON_STATE;
  }
}

export async function getMoonState(): Promise<MoonState> {
  return parseMoonState(await AsyncStorage.getItem(STORAGE_KEY));
}

// Live observers of the persisted moon (the tab-bar moon renders off this).
// Notified after every successful save with the state that was written.
type MoonListener = (state: MoonState) => void;
const listeners = new Set<MoonListener>();

export function subscribeMoonState(listener: MoonListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function save(state: MoonState): Promise<MoonState> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  for (const listener of listeners) {
    try {
      listener(state);
    } catch {
      // A broken listener never blocks the write.
    }
  }
  return state;
}

/**
 * Light landed: refresh brightness (bright by default; only fading lessons
 * dim it — the caller derives the count from the ledger) and let the material
 * ladder re-derive. Saves — and notifies listeners — only on a real change.
 */
export async function advanceMoonOnEarn(
  totals: LedgerTotals,
  brightness: number,
): Promise<MoonState> {
  return withStoreLock(STORAGE_KEY, async () => {
    const state = await getMoonState();
    const next = withMaterial(withBrightness(state, brightness), totals);
    return next === state ? state : save(next);
  });
}

/**
 * Period confirmed: mint the completed cycle onto the shelf. The caller
 * supplies what the ledger knows (engaged dates, totals) so this store never
 * imports the ledger. Deduped by cycle end; a kept cycle can raise the
 * material or, at diamond, add a facet.
 */
export async function recordCycleMint(input: {
  cycleStart: string;
  cycleEnd: string;
  clarity: RemissionAnswer | null;
  engagedDates: ReadonlySet<string>;
  totals: LedgerTotals;
}): Promise<MoonState> {
  return withStoreLock(STORAGE_KEY, async () => {
    const state = await getMoonState();
    if (state.shelf.some((m) => m.cycleEnd === input.cycleEnd)) return state;
    const minted = mintCycleMoon({
      cycleStartYmd: input.cycleStart,
      cycleEndYmd: input.cycleEnd,
      engagedDates: input.engagedDates,
      clarity: input.clarity,
      material: state.material,
    });
    if (minted == null) return state;
    const next = withMaterial(applyMint(state, minted), input.totals);
    return next === state ? state : save(next);
  });
}

export { cyclesKept };
export type { MoonState, MintedMoon, MoonMaterial };
