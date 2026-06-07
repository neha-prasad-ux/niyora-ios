import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'niyora:mac-promo-dismissed';

export async function getMacPromoDismissed(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw === '1';
}

export async function setMacPromoDismissed(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}
