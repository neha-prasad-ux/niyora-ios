import AsyncStorage from '@react-native-async-storage/async-storage';

// The home moon's breathing cue: a soft invitation that rides the soul when
// she arrives. The very first open ever names the relationship with the fuller
// line; later opens repeat the short line, but only on genuine arrivals (hours
// away), so a quick bounce out and back does not replay it. Stays on device.
export type BreathCue = 'first' | 'arrival';

type BreathCueState = {
  lastOpenAt: string; // ISO timestamp of the previous home open
  seenIntro: boolean;
};

const KEY = 'niyora:home-breath-cue';

// How long she must be away for the next open to count as an arrival.
export const ARRIVAL_GAP_HOURS = 4;

// Pure parse so junk storage degrades to "never opened" (tested without the UI).
export function parseBreathCueState(raw: string | null): BreathCueState | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (v == null || typeof v !== 'object') return null;
    const { lastOpenAt, seenIntro } = v as { lastOpenAt?: unknown; seenIntro?: unknown };
    if (typeof lastOpenAt !== 'string') return null;
    return { lastOpenAt, seenIntro: seenIntro === true };
  } catch {
    return null;
  }
}

// Which cue this open earns, given what was stored at the previous open.
export function cueFor(state: BreathCueState | null, now: Date): BreathCue | null {
  if (state == null || !state.seenIntro) return 'first';
  const last = Date.parse(state.lastOpenAt);
  if (!Number.isFinite(last)) return 'arrival';
  return now.getTime() - last >= ARRIVAL_GAP_HOURS * 3_600_000 ? 'arrival' : null;
}

// Decide the cue for this open and stamp the open time. Every open stamps
// (so the arrival clock measures time truly away, not time since last cue);
// storage failures err quiet toward showing nothing odd.
export async function takeBreathCue(now: Date = new Date()): Promise<BreathCue | null> {
  const state = parseBreathCueState(await AsyncStorage.getItem(KEY).catch(() => null));
  const cue = cueFor(state, now);
  const next: BreathCueState = { lastOpenAt: now.toISOString(), seenIntro: true };
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return cue;
}
