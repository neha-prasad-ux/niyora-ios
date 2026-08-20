import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether the user has explicitly agreed to Moon AI (Apple 5.1.2(i) launch
// gate): before any reflection text can be sent to the AI, the "Meet Moon"
// consent screen must be seen and agreed to. Stays on device like every other
// Niyora preference: nothing leaves the phone.
const KEY = 'niyora:moon-consent';

export async function getMoonConsent(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw === '1';
}

export async function setMoonConsent(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}
