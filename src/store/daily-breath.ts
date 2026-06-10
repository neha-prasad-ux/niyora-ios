import AsyncStorage from '@react-native-async-storage/async-storage';
import { unlockedTechniques } from '@/models/techniques';

type DailyBreathRecord = {
  techniqueId: string;
  dateStr: string;
};

const STORAGE_KEY = 'niyora:daily-breath';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseRecord(raw: string | null): DailyBreathRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.techniqueId === 'string' &&
      typeof parsed.dateStr === 'string'
    ) {
      return parsed as DailyBreathRecord;
    }
    return null;
  } catch {
    return null;
  }
}

// Returns today's technique id, stable for the calendar day. Picks a new one
// at random from the unlocked set when the date rolls over.
export async function getTodaysTechnique(): Promise<string> {
  const todayStr = localDateStr(new Date());
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const record = parseRecord(raw);

  if (record && record.dateStr === todayStr) {
    return record.techniqueId;
  }

  const available = unlockedTechniques();
  const techniqueId = available[Math.floor(Math.random() * available.length)]?.id ?? 'box';

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ techniqueId, dateStr: todayStr }));
  return techniqueId;
}
