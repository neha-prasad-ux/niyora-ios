import AsyncStorage from '@react-native-async-storage/async-storage';

import { withStoreLock } from './with-store-lock';

export type CheckInLevel = 'light' | 'okay' | 'heavy';

export type CheckInRecord = {
  level: CheckInLevel;
  recordedAt: string; // ISO 8601
};

const STORAGE_KEY = 'niyora:checkins';

function parseRecords(raw: string | null): CheckInRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CheckInRecord[]) : [];
  } catch {
    return [];
  }
}

export async function appendCheckIn(level: CheckInLevel): Promise<void> {
  return withStoreLock(STORAGE_KEY, async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const records = parseRecords(raw);
    records.push({ level, recordedAt: new Date().toISOString() });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  });
}

export async function getCheckInRecords(): Promise<CheckInRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseRecords(raw);
}

export function todayCheckIn(records: CheckInRecord[]): CheckInRecord | null {
  const today = new Date().toDateString();
  for (let i = records.length - 1; i >= 0; i--) {
    if (new Date(records[i].recordedAt).toDateString() === today) {
      return records[i];
    }
  }
  return null;
}
