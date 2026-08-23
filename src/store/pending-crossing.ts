import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MoonMaterial } from '@/lib/moon-light';
import type { Tier } from '@/models/tiers';

// A crossing owed a celebration. recordLight is the one write path for light,
// but most callers discard its result, so a ring earned by training/noticing/
// applying/visiting, and every material crossing, used to vanish silently.
// Instead recordLight persists the crossing here; Home plays it the next time
// she lands on the moon, so the "your soul just grew" moment is unified no
// matter where the light was earned. Consumed and cleared on play. On device.

export type CrossingKind = 'ring' | 'material';
export type PendingCrossing = { kind: CrossingKind; label: string; hue: number };

const STORAGE_KEY = 'niyora:pending-crossing';
const KINDS: readonly CrossingKind[] = ['ring', 'material'];

// The materials have no hue of their own (unlike tiers), so the celebration
// borrows one: warm gold, opal violet, icy diamond.
const MATERIAL_HUE: Record<MoonMaterial, number> = {
  moonstone: 220,
  gold: 45,
  opal: 275,
  diamond: 200,
};
const MATERIAL_LABEL: Record<MoonMaterial, string> = {
  moonstone: 'Moonstone',
  gold: 'Gold',
  opal: 'Opal',
  diamond: 'Diamond',
};

export function ringCrossing(tier: Tier): PendingCrossing {
  return { kind: 'ring', label: tier.name, hue: tier.hue };
}

export function materialCrossing(material: MoonMaterial): PendingCrossing {
  return { kind: 'material', label: MATERIAL_LABEL[material], hue: MATERIAL_HUE[material] };
}

// Pure parse so junk storage degrades to nothing owed.
export function parsePendingCrossings(raw: string | null): PendingCrossing[] {
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (c): c is PendingCrossing =>
        c != null &&
        typeof c === 'object' &&
        KINDS.includes((c as PendingCrossing).kind) &&
        typeof (c as PendingCrossing).label === 'string' &&
        typeof (c as PendingCrossing).hue === 'number',
    );
  } catch {
    return [];
  }
}

export async function getPendingCrossings(): Promise<PendingCrossing[]> {
  return parsePendingCrossings(await AsyncStorage.getItem(STORAGE_KEY));
}

export async function pushPendingCrossing(crossing: PendingCrossing): Promise<void> {
  const all = await getPendingCrossings();
  all.push(crossing);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Clear everything owed, or just one kind (a screen that already showed the
 *  ring inline clears 'ring' so Home does not play it a second time). */
export async function clearPendingCrossings(kind?: CrossingKind): Promise<void> {
  if (kind == null) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  const kept = (await getPendingCrossings()).filter((c) => c.kind !== kind);
  if (kept.length === 0) await AsyncStorage.removeItem(STORAGE_KEY);
  else await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
}
