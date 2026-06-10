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

export async function getSessionsThisWeek(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const records = parseRecords(raw);
  const now = new Date();
  const day = now.getDay(); // 0=Sunday, 1=Monday, …, 6=Saturday
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  return records.filter((r) => new Date(r.completedAt) >= weekStart).length;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getSessionsToday(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const records = parseRecords(raw);
  const todayStr = localDateStr(new Date());
  return records.filter((r) => localDateStr(new Date(r.completedAt)) === todayStr).length;
}

export async function getLastSession(): Promise<SessionRecord | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const records = parseRecords(raw);
  return records.length > 0 ? records[records.length - 1] : null;
}

export async function getCurrentStreak(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const records = parseRecords(raw);
  const sessionDates = new Set(records.map((r) => localDateStr(new Date(r.completedAt))));
  const now = new Date();
  const todayStr = localDateStr(now);
  // If today has no session, start from yesterday so users aren't penalized for not breathing yet.
  let offset = sessionDates.has(todayStr) ? 0 : 1;
  let streak = 0;
  while (true) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    if (!sessionDates.has(localDateStr(d))) break;
    streak++;
    offset++;
  }
  return streak;
}
