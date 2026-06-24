import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'niyora:voice-guidance';
// Off by default: voice guidance is opt-in, the silent breath stays the baseline.
const DEFAULT_ON = false;

export async function getVoiceGuidance(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === 'on') return true;
  if (raw === 'off') return false;
  return DEFAULT_ON;
}

export async function setVoiceGuidance(on: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
}
