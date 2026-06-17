import AsyncStorage from '@react-native-async-storage/async-storage';

// Phase B4 — nudge history (the ground truth).
//
// Every "feeling tense?" nudge and the user's Yes / No / Not-now answer is
// recorded here, on device only. This is the answer key the whole system tunes
// against (Phase E): it tells us when detection was right or wrong. It also
// feeds the nudge policy its `lastNudgeAt` and `nudgesToday`, closing the loop
// detection -> policy -> nudge -> answer -> (next) policy.

export type NudgeAnswer = 'yes' | 'no' | 'later';

export type NudgeEvent = {
  /** ISO-8601 time the nudge fired. Also the event's identity. */
  firedAt: string;
  /** The user's answer, or null until they respond (or never do). */
  answer: NudgeAnswer | null;
  /** Verdict snapshot at fire time, for after-the-fact analysis. */
  currentHr: number | null;
  resting: number | null;
};

const STORAGE_KEY = 'niyora:nudge-history';

export function parseHistory(raw: string | null): NudgeEvent[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is NudgeEvent => e && typeof e.firedAt === 'string',
    );
  } catch {
    return [];
  }
}

export async function getNudgeHistory(): Promise<NudgeEvent[]> {
  return parseHistory(await AsyncStorage.getItem(STORAGE_KEY));
}

async function save(events: NudgeEvent[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

/** Append a freshly-fired nudge (answer still pending). Returns the event. */
export async function recordNudgeFired(
  event: Omit<NudgeEvent, 'answer'>,
): Promise<NudgeEvent> {
  const events = await getNudgeHistory();
  const full: NudgeEvent = { ...event, answer: null };
  events.push(full);
  await save(events);
  return full;
}

/**
 * Record the answer to the most recent unanswered nudge (or, when given, the
 * nudge with the matching firedAt). Returns true if an event was updated.
 */
export async function recordAnswer(
  answer: NudgeAnswer,
  firedAt?: string,
): Promise<boolean> {
  const events = await getNudgeHistory();
  let idx = -1;
  if (firedAt) {
    idx = events.findIndex((e) => e.firedAt === firedAt);
  } else {
    // Most recent still-unanswered nudge.
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].answer === null) {
        idx = i;
        break;
      }
    }
  }
  if (idx === -1) return false;
  events[idx] = { ...events[idx], answer };
  await save(events);
  return true;
}

// --- Pure helpers (feed the nudge policy's NudgeContext) ---------------------

/** Most recent fire time, or null. Does not assume the list is sorted. */
export function latestNudgeAt(events: NudgeEvent[]): Date | null {
  let latest: number | null = null;
  for (const e of events) {
    const t = new Date(e.firedAt).getTime();
    if (Number.isNaN(t)) continue;
    if (latest === null || t > latest) latest = t;
  }
  return latest === null ? null : new Date(latest);
}

/** How many nudges fired on the same local day as `now`. */
export function nudgesToday(events: NudgeEvent[], now: Date = new Date()): number {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  return events.filter((e) => {
    const t = new Date(e.firedAt);
    return (
      !Number.isNaN(t.getTime()) &&
      t.getFullYear() === y &&
      t.getMonth() === m &&
      t.getDate() === d
    );
  }).length;
}
