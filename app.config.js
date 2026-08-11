// Dynamic app config: fold in the static app.json, then inject the Moon AI
// settings into `extra`, read from the environment at build time (this runs in
// Node, so .env.local locally and the EAS env on a build are both available).
//
// Why not EXPO_PUBLIC_* directly? The babel EXPO_PUBLIC inlining was NOT reaching
// the production bundle (verified: the flag never appeared in a shipped .ipa), so
// MOMENT_AI compiled to false and the whole provider was stripped out of every
// TestFlight build. `extra` is resolved here in Node and embedded in the app
// manifest reliably, and the code reads it via expo-constants.
//
// No Google key rides in the bundle anymore. The app calls Gemini through
// Firebase AI Logic, whose config lives in the native GoogleService-Info.plist
// (see app.json ios.googleServicesFile), not in `extra`. This flag stays the
// only AI switch: with it off, getMomentProvider() ships no AI.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    momentAi: process.env.EXPO_PUBLIC_MOMENT_AI === '1',
  },
});
