import AsyncStorage from '@react-native-async-storage/async-storage';

export type SessionRecord = {
  techniqueId: string;
  completedAt: string; // ISO 8601
};

const STORAGE_KEY = 'niyora:sessions';

function parseRecords(raw: string | null): SessionRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

export async function appendSession(techniqueId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const records = parseRecords(raw);
  records.push({ techniqueId, completedAt: new Date().toISOString() });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function getSessionCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseRecords(raw).length;
}
