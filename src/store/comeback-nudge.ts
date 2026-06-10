import AsyncStorage from '@react-native-async-storage/async-storage';

// Tracks when we last scheduled a comeback nudge so we enforce the one-per-lapse cap.
// Stays entirely on device; nothing is ever sent off the phone.
const STORAGE_KEY = 'niyora:comeback-nudge';

export async function getLastCombackNudgeSentAt(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function setLastCombackNudgeSentAt(isoTime: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, isoTime);
}
