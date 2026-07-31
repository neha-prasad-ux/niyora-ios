import AsyncStorage from '@react-native-async-storage/async-storage';

// How many gift-scratch drawings she has earned so far. Drawings are awarded one
// by one IN ORDER (Neha 2026-07-31), so this count picks the next one:
// MOON_DRAWINGS[count % length]. On device like every other preference.
const KEY = 'niyora:reward-progress';

export async function getRewardCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY);
  const n = raw == null ? 0 : parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Advance to the next drawing after she earns the current one. */
export async function bumpRewardCount(): Promise<void> {
  const n = await getRewardCount();
  await AsyncStorage.setItem(KEY, String(n + 1));
}
