import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'niyora:weekly-recap-dismissed';

// ISO 8601 week key: the week containing Thursday belongs to that year.
// Returns e.g. "2026-W24".
export function currentWeekKey(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayOfWeek = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek); // move to Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export async function getRecapDismissedWeek(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function setRecapDismissedWeek(weekKey: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, weekKey);
}
