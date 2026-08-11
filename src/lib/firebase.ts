// App Check is what replaces the API key. Firebase AI Logic will only accept a
// request that carries a valid App Check token, and on iOS that token comes from
// Apple App Attest: the OS vouches that the call is from the real, unmodified
// Niyora app on a real device. A key can be extracted from a bundle; an App
// Attest assertion cannot be forged off-device. Start this ONCE, before any AI
// call (see src/lib/moment-gemini.ts), from the root layout.
//
// No-op and swallowed if Firebase isn't configured in this build (no
// GoogleService-Info.plist, so getApp() throws) or if attestation isn't available
// (a Simulator). In dev we use the 'debug' provider; register the debug token it
// prints to the native log in the Firebase console once. Enforcement is a console
// toggle that stays OFF until you turn it on, so this never blocks development.

import { getApp } from '@react-native-firebase/app';
import {
  initializeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
} from '@react-native-firebase/app-check';

let started = false;

export function startAppCheck(): void {
  if (started) return;
  started = true;
  try {
    const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({
      apple: { provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback' },
    });
    initializeAppCheck(getApp(), { provider, isTokenAutoRefreshEnabled: true });
  } catch (e) {
    // Unconfigured build or Simulator: the AI provider will just stay off and the
    // Moon flow falls back to authored copy. Never fatal.
    if (__DEV__) console.log('[appcheck] not started:', String((e as Error)?.message ?? e));
  }
}
