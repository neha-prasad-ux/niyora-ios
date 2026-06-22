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
