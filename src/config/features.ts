import Constants from 'expo-constants';

// v1 feature gates. Flip to re-enable; the stores and components stay intact.

// The daily mood check-in (light / okay / heavy logging) is hidden for v1.
// The post-session mood prompt after a breath is unaffected.
export const SHOW_CHECKIN = false;

// v1 collects no analytics, so the opt-in toggle and its copy are hidden to
// keep the UI honest with the "No Data Collected" privacy label. Re-enable
// alongside the analytics integration.
export const SHOW_ANALYTICS = false;

// The post-session "Feel better? / try another" flow no longer logs a 1-5 mood,
// so the mood trend strip has no data to show in v1. Hidden until there is a
// data source again.
export const SHOW_MOOD_TREND = false;

// Stress-detection experiment (Phase E). Gates the whole stress loop's auto-run
// (the foreground tick + nudges) AND its dev surfaces (the probe screen + the
// "HK" home entry). OFF by default so the v1 store build ships none of it; ON
// only in builds that set EXPO_PUBLIC_STRESS_EXPERIMENT=1 (the development /
// preview EAS profiles, the local experiment build, and Metro for dev). Pairs
// with the NIYORA_HEALTHKIT entitlement flag. both on for the experiment build,
// both off for the store build.
export const STRESS_EXPERIMENT = process.env.EXPO_PUBLIC_STRESS_EXPERIMENT === '1';

// Moon dimming for fading lessons (moon-reward-spec.md): a recall left past
// its grace dims the moon a step. MUST stay off until the recall quiz UI
// ships — with no way to answer, moons would dim with no way to brighten.
export const RECALL_FADING = false;

// Cloud AI in the Moon flow (moment.tsx), via Firebase AI Logic (src/lib/
// moment-gemini.ts). Gates the cloud provider behind the MomentProvider port. OFF
// by default so the store build ships NO AI and every beat runs its deterministic/
// authored line. A build lights it up with EXPO_PUBLIC_MOMENT_AI=1 AND Firebase
// configured (GoogleService-Info.plist); with either missing, getMomentProvider()
// returns NO_PROVIDER and the flow is byte-identical to the deterministic build.
export const MOMENT_AI = Constants.expoConfig?.extra?.momentAi === true;

// ── Paywall preview (design work only) ───────────────────────────────────────
// StoreKit needs a native module and a configured store, so on a plain dev build
// there is no way to see a price and the wall's design cannot be judged at all.
// These two open that door, and BOTH must be false in anything that ships:
// together they mean nobody can ever buy. src/config/features.test.ts fails
// while either is on, so a preview flag cannot reach a build by being forgotten.

/** Render the wall from a fixture instead of StoreKit, and never mount useIAP. */
export const PAYWALL_PREVIEW = false;

/** Send every Moon flow to the wall, so it can be reached without first writing
 *  five real moments. Leaves FREE_MOMENTS_PER_MONTH alone so the copy still
 *  states the real rule. */
export const FORCE_PAYWALL = false;
