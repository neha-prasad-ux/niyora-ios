import AsyncStorage from '@react-native-async-storage/async-storage';

// Daily breath reminder preferences. Stays entirely on device; the time is
// used to schedule a local notification, nothing is ever sent off the phone.
export type ReminderPrefs = {
  enabled: boolean;
  hour: number; // 0-23, local time
  minute: number; // 0-59
};

const STORAGE_KEY = 'niyora:reminder';

export const DEFAULT_REMINDER: ReminderPrefs = {
  enabled: false,
  hour: 20,
  minute: 0,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? Math.floor(value) : NaN;
  if (Number.isNaN(n) || n < min || n > max) return fallback;
  return n;
}

export function parseReminder(raw: string | null): ReminderPrefs {
  if (!raw) return DEFAULT_REMINDER;
  try {
    const parsed = JSON.parse(raw) as Partial<ReminderPrefs>;
    return {
      enabled: parsed.enabled === true,
      hour: clampInt(parsed.hour, 0, 23, DEFAULT_REMINDER.hour),
      minute: clampInt(parsed.minute, 0, 59, DEFAULT_REMINDER.minute),
    };
  } catch {
    return DEFAULT_REMINDER;
  }
}

export async function getReminder(): Promise<ReminderPrefs> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseReminder(raw);
}

export async function setReminder(prefs: ReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
