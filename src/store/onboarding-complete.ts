import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether the first-launch onboarding has been finished (or skipped). Stays on
// device like every other Niyora preference: nothing leaves the phone.
const KEY = 'niyora:onboarding-complete';

export async function getOnboardingComplete(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw === '1';
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}

// Clears the flag so the intro plays again on next launch / navigation.
// Used by the "Watch the intro again" entry in My Soul.
export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
