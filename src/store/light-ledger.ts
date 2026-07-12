import AsyncStorage from '@react-native-async-storage/async-storage';

import { lightEarned } from '@/lib/light-bus';
import {
  dayToYmd,
  earnLight,
  fadingRecalls,
  foldLedger,
  localYmd,
  moonBrightness,
  ymdToDay,
  FULLNESS_MAX,
  LIGHT_BASE,
  RINGS,
  type LightEvent,
  type LightKind,
} from '@/lib/moon-light';
import { RECALL_FADING } from '@/config/features';
import { earnedTierBetween, type Tier } from '@/models/tiers';
import { advanceMoonOnEarn } from '@/store/moon-state';
import { getSessionCount } from '@/store/session-history';
import { getTodayActionMemory } from '@/store/today-action';

// Append-only ledger of every light-earning act (moon-reward-spec.md). Amounts
// are computed once at append time — caps, diminishing repeats, and the
// coached-action multiplier included — so history never re-prices. Lifetime
// totals fold from it. Stays entirely on device, like the rest of the state.

const STORAGE_KEY = 'niyora:light-ledger';

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const KINDS: readonly LightKind[] = ['visit', 'calm', 'train', 'recall', 'notice', 'apply'];

// Pure parse so junk storage degrades to an empty ledger.
export function parseLightLedger(raw: string | null): LightEvent[] {
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (e): e is LightEvent =>
        e != null &&
        typeof e === 'object' &&
        typeof (e as LightEvent).date === 'string' &&
        YMD.test((e as LightEvent).date) &&
        KINDS.includes((e as LightEvent).kind) &&
        typeof (e as LightEvent).amount === 'number' &&
        (e as LightEvent).amount > 0,
    );
  } catch {
    return [];
  }
}

export async function getLightLedger(): Promise<LightEvent[]> {
  return parseLightLedger(await AsyncStorage.getItem(STORAGE_KEY));
}

// Does this act match today's coached action? Read off the rotation memory
// (what the Now card actually showed today) rather than re-running the
// selector: cheap, and conservative when she never saw the card.
async function matchedToday(kind: LightKind, refId: string | undefined, today: string) {
  if (kind !== 'calm' && kind !== 'train') return false;
  const memory = await getTodayActionMemory();
  if (memory.last == null || memory.last.date !== today) return false;
  if (kind === 'calm') return memory.last.id.startsWith('session:');
  return refId != null && memory.last.id === `train:${refId}`;
}

export type RecordLightResult = {
  /** The appended event, or null when the act earned nothing. */
  event: LightEvent | null;
  /** The Soul ring this act's light crossed into, for the celebration. */
  ringEarned: Tier | null;
};

const NOTHING: RecordLightResult = { event: null, ringEarned: null };

/**
 * The one write path for light: price the act against today's ledger, append,
 * wax the moon, and report any ring crossing (rings are lifetime-light
 * milestones — models/tiers). A null event means the act earned nothing this
 * time (repeat visit, third calm, replayed level, capped day) — the act
 * itself is still welcome; only the light is capped.
 */
export async function recordLight(
  kind: LightKind,
  opts: { refId?: string; now?: Date } = {},
): Promise<RecordLightResult> {
  const now = opts.now ?? new Date();
  const today = localYmd(now);
  const ledger = await getLightLedger();

  // Grandfather clause: rings used to be earned by session counts. A user with
  // history but an empty ledger gets her sessions' worth of light seeded once
  // (a calm's worth each, capped at the last ring) so earned rings stand —
  // rings are never lost. Dated yesterday so it neither eats today's cap nor
  // fires a celebration for rings she already had.
  if (ledger.length === 0) {
    const sessions = await getSessionCount().catch(() => 0);
    if (sessions > 0) {
      ledger.push({
        date: dayToYmd((ymdToDay(today) ?? 0) - 1),
        kind: 'calm',
        amount: Math.min(sessions * LIGHT_BASE.calm, RINGS[RINGS.length - 1].light),
        refId: 'legacy-sessions',
      });
    }
  }

  // Cross-day honesty guards: a level completes once ever; a level has
  // exactly two recalls. (Same-day repeats are priced by earnLight.)
  if (kind === 'train' && opts.refId != null) {
    if (ledger.some((e) => e.kind === 'train' && e.refId === opts.refId)) return NOTHING;
  }
  if (kind === 'recall' && opts.refId != null) {
    if (ledger.filter((e) => e.kind === 'recall' && e.refId === opts.refId).length >= 2) {
      return NOTHING;
    }
  }

  const matched = await matchedToday(kind, opts.refId, today);
  const amount = earnLight({
    kind,
    todaysEvents: ledger.filter((e) => e.date === today),
    matchedAction: matched,
  });
  if (amount <= 0) return NOTHING;

  const lightBefore = ledger.reduce((sum, e) => sum + e.amount, 0);
  const event: LightEvent = {
    date: today,
    kind,
    amount,
    ...(opts.refId != null ? { refId: opts.refId } : {}),
    ...(matched ? { matchedAction: true } : {}),
  };
  ledger.push(event);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  // Brightness is bright by default; only fading lessons dim it — and only
  // once the recall surface exists to brighten it back (config/features).
  const brightness = RECALL_FADING
    ? moonBrightness(fadingRecalls(ledger, today).length)
    : FULLNESS_MAX;
  await advanceMoonOnEarn(foldLedger(ledger), brightness).catch(() => {});
  // Announce after the moon has updated, so listeners see the state the light made.
  lightEarned.emit(event);
  return { event, ringEarned: earnedTierBetween(lightBefore, lightBefore + amount) };
}
