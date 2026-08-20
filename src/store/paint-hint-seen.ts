import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether she has seen the "Drag to colour" first-run hint on the paint screen.
// The colouring interaction is invisible on its own, so we nudge it once and
// never again. Stays on device like every other Niyora preference.
const KEY = 'niyora:paint-hint-seen';

export async function getPaintHintSeen(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw === '1';
}

export async function setPaintHintSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}
