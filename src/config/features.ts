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

// The "Rough moment" on-device AI CBT session (Apple Foundation Models spike).
// Gates ONLY the dev spike probe (fm-probe) now — the Reflect session itself
// ships as part of the Steady-yourself flow, scripted (see REFLECT_AI). ON in
// dev so the probe is reachable from Metro.
export const FM_EXPERIMENT = __DEV__ || process.env.EXPO_PUBLIC_FM_EXPERIMENT === '1';

// On-device AI inside the Reflect ("start fresh") session. Gated behind an
// experiment flag so the store build still ships with NO AI (env unset → every
// beat runs its scripted line, the flow completes on any device), while a test
// build can light it up by setting EXPO_PUBLIC_REFLECT_AI=1.
//
// `modelTurn` in rough-moment.tsx is the single seam; it calls ReflectModel
// (src/lib/reflect-model.ts), which prefers on-device Gemma (niyora-gemma /
// LiteRT-LM — runs on the A16 test phone) and falls back to Apple Foundation
// Models, then to scripted. Even with this ON, a device where no model is
// available (model not bundled, MediaPipe not linked) degrades to scripted.
export const REFLECT_AI = process.env.EXPO_PUBLIC_REFLECT_AI === '1';

// Gemini in the Moon flow (moment.tsx). Gates the cloud provider behind the
// MomentProvider port. OFF by default so the store build ships NO AI and every
// beat runs its deterministic/authored line. A test build lights it up with
// EXPO_PUBLIC_MOMENT_AI=1 AND an EXPO_PUBLIC_GEMINI_API_KEY; with either missing,
// getMomentProvider() returns NO_PROVIDER and the flow is byte-identical to the
// deterministic build. Replaces the on-device Gemma seam (REFLECT_AI).
export const MOMENT_AI = process.env.EXPO_PUBLIC_MOMENT_AI === '1';
