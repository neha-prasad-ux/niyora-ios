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
