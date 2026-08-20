import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether she has seen the moment flow's "Let's work through this together"
// intro. It's an orientation for the very first run, not something to sit through
// every time. Stays on device like every other Niyora preference.
const KEY = 'niyora:moment-intro-seen';

export async function getIntroSeen(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw === '1';
}

export async function setIntroSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}
