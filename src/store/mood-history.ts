import AsyncStorage from '@react-native-async-storage/async-storage';

export type MoodValue = 1 | 2 | 3 | 4 | 5;

export type MoodRecord = {
  techniqueId: string;
  mood: MoodValue;
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

export async function appendMood(techniqueId: string, mood: MoodValue): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const records = parseRecords(raw);
  records.push({ techniqueId, mood, recordedAt: new Date().toISOString() });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function getMoodRecords(): Promise<MoodRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseRecords(raw);
}
