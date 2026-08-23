// A resume checkpoint for the in-the-moment flow. The session is otherwise
// ephemeral by design (see moment.tsx header), this is the one exception: if she
// leaves mid-flow, Home offers to pick it up where she left off. Written as she
// moves through beats, cleared when the flow ends (close / crisis), so a finished
// session never offers a stale resume.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NodeId } from '@/v3/moment-flow';
import type { Verdict } from '@/v3/moment-analyse';
import type { Act } from '@/v3/moment-copy';

const KEY = 'niyora:moment-resume';

// An in-the-moment feeling is a same-day thing, so a checkpoint older than this
// is dropped rather than offered cold.
// ponytail: 24h TTL, tune if resumes feel too eager or too rare.
const TTL_MS = 24 * 60 * 60 * 1000;

/** The carried narrative state, enough to land back on the beat she left. The
 *  transient per-beat UI (streaming echo, open fields, model orderings) is not
 *  stored: re-entering a beat re-arms it. */
export type MomentCheckpoint = {
  current: NodeId;
  history: NodeId[];
  herText: string;
  chosenFeeling: string;
  /** Where she is in the routed reflect-card list, so a resume into `reflect`
   *  lands on the same card. The list itself is re-derived from herText. */
  reflectIdx: number;
  verdict: Verdict | null;
  chosenAct: Act | null;
  skippedHold: boolean;
  readyLow: boolean;
  savedAt: number;
};

export async function saveMomentCheckpoint(
  cp: Omit<MomentCheckpoint, 'savedAt'>,
): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...cp, savedAt: Date.now() }));
}

/** The saved checkpoint, or null if none / stale / unreadable. A stale one is
 *  cleared as a side effect so it stops being offered. */
export async function getMomentCheckpoint(): Promise<MomentCheckpoint | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const cp = JSON.parse(raw) as MomentCheckpoint;
    if (!cp?.current || Date.now() - (cp.savedAt ?? 0) > TTL_MS) {
      await clearMomentCheckpoint();
      return null;
    }
    return cp;
  } catch {
    return null;
  }
}

export async function clearMomentCheckpoint(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
