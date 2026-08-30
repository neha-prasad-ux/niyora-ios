import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether she has been shown the Premium trial once, at the end of her first
// run. Shown ONCE and never again: the gate at 5 moments a month is the other
// door, and a wall that reappears on every launch is the thing that gets an app
// deleted rather than subscribed to.
//
// Set the moment it is shown, not when she answers, so a crash or a fast dismiss
// cannot turn into a second showing.
const KEY = 'niyora:premium-offered';

export async function getPremiumOffered(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === '1';
}

export async function setPremiumOffered(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}
