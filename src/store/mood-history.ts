import AsyncStorage from '@react-native-async-storage/async-storage';

import { withStoreLock } from './with-store-lock';

export type MoodValue = 1 | 2 | 3 | 4 | 5;

export type MoodRecord = {
  techniqueId: string;
  mood: MoodValue;
  // The feeling the user came in with (from the "recommend by feeling" flow),
  // if any. Closes the loop: emotion -> recommendation -> impact, so we can
  // later rank techniques by how much they helped a given feeling. Local-only.
  feeling?: string;
  recordedAt: string; // ISO 8601
};

const STORAGE_KEY = 'niyora:moods';

function parseRecords(raw: string | null): MoodRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MoodRecord[]) : [];
  } catch {
    return [];
  }
}

export async function appendMood(
  techniqueId: string,
  mood: MoodValue,
  feeling?: string,
): Promise<void> {
  return withStoreLock(STORAGE_KEY, async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const records = parseRecords(raw);
    const record: MoodRecord = { techniqueId, mood, recordedAt: new Date().toISOString() };
    if (feeling) record.feeling = feeling;
    records.push(record);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  });
}

export async function getMoodRecords(): Promise<MoodRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseRecords(raw);
}

// How a session/activity closed: she either felt good, or chose to reflect on
// the feeling (it had not lifted yet). This is the binary we ask today. Until a
// graded 1-5 ask ships (deferred to when there's a user base), we store it on
// the same 1-5 scale so the trend + future deltas keep one shape: "good" sits
// high, "reflected" sits low-middle. Not fabricated precision -- a coarse two
// point sample of the same axis the graded ask will fill in.
export type CloseOutcome = 'good' | 'reflected';

const OUTCOME_MOOD: Record<CloseOutcome, MoodValue> = {
  good: 4,
  reflected: 2,
};

// Save how a close went, keyed to the practice and the feeling she came in with
// (emotion -> practice -> impact). One record per close; callers guard against
// double-recording when she reflects and then taps "I feel good".
export async function recordOutcome(
  techniqueId: string,
  outcome: CloseOutcome,
  feeling?: string,
): Promise<void> {
  return appendMood(techniqueId, OUTCOME_MOOD[outcome], feeling);
}
