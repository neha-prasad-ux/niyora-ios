import AsyncStorage from '@react-native-async-storage/async-storage';

export type SessionRecord = {
  techniqueId: string;
  completedAt: string; // ISO 8601
};

const STORAGE_KEY = 'niyora:sessions';

export async function appendSession(techniqueId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const records: SessionRecord[] = raw ? (JSON.parse(raw) as SessionRecord[]) : [];
  records.push({ techniqueId, completedAt: new Date().toISOString() });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function getSessionCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return 0;
  return (JSON.parse(raw) as SessionRecord[]).length;
}
