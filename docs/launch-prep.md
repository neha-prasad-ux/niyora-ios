# Niyora launch prep — handoff (2026-08-11)

> **➡️ START HERE:** `docs/handover-2026-08-12.md` is the current state (gate #1 done + live on TestFlight 33, crisis pass done, Moon reflection redesign in-flight, consent screen to build). This file below is the older gate-by-gate reference.

Pick-up doc for a fresh session focused on getting Niyora from "internal testing" to "public App Store launch." Everything from the 2026-08-10/11 marathon is committed on `build/testflight-1.0.0-b20` (commit `da29ddd`): reflect redesign, on-device moment memory (store + My Soul + thread pickup + pattern card + AES-Keychain encryption), PMS auto-banner (no tone change), PII self-intro-name scrub, keyboard/mic/scratch fixes, EAS config. tsc clean, 759 tests pass.

## Where things stand
- **Internal testing is unblocked.** EAS is configured (eas.json profiles map to EAS environments; Gemini key set as a SENSITIVE env var in both `production` and `preview`; Apple creds managed by EAS). App Store Connect app already exists (`ascAppId 6764561688`).
- **In flight when this handoff was written:** `eas build --platform ios --profile production` (build 28) was uploading a ~1 GB archive to EAS. It may have finished, failed, or need re-running — check `eas build:list`. `eas submit --platform ios --profile production --latest` is the still-pending step to push it to TestFlight, then add internal testers in App Store Connect (Neha's Apple-account step).
- **Not installed on Neha's phone:** the banner + scratch-padding cable build (phone disconnected mid-install) — it IS in commit da29ddd so it rides along in the EAS build.

## The public-launch gates (ordered by priority)

1. **API key must stop shipping in the bundle. [#1 GATE] — CODE DONE, FIREBASE SETUP + BUILD PENDING.**
   Decision (2026-08-11): **no backend.** Instead of the `proxy/` (now superseded, see below), the app calls Gemini through **Firebase AI Logic + App Check** — Google's managed "no key in the app" path. The app holds no Google key: auth is the Firebase project (native `GoogleService-Info.plist`), and App Check (Apple App Attest) attests the request so the Vertex endpoint accepts only the real Niyora app. Vertex backend = enterprise terms (no training, no human review). Trade-off vs the proxy: Google sees the device IP (the proxy hid it); words are still PII-scrubbed + Vertex-covered.
   **Done in code (tsc clean, 759 tests pass):**
   - `src/lib/moment-gemini.ts` — egress rewired to `getGenerativeModel(getAI(app, VertexAIBackend('us-central1'))).generateContent()`; `MomentProvider` contract, PII scrub, retry, transport-tracking all kept. Gates on Firebase being configured, not a key. Model = `gemini-3.6-flash` (constant `MODEL`).
   - `src/lib/firebase.ts` (new) — `startAppCheck()`, called once from `src/app/_layout.tsx`. `appAttestWithDeviceCheckFallback` in prod, `debug` in dev.
   - `app.json` — added plugins `@react-native-firebase/app` (with `{ ios: { disableSPM: true } }`, see below), `@react-native-firebase/app-check`, `expo-build-properties` (iOS `useFrameworks: static`, required by RNFirebase), and `ios.googleServicesFile: ./GoogleService-Info.plist`.
   - Deps added: `@react-native-firebase/{app,ai,app-check}` + `expo-build-properties`. `app.config.js`/`.env.local` proxy vars reverted (only `EXPO_PUBLIC_MOMENT_AI` remains).
   **Done in native setup (2026-08-11):**
   - Registered the iOS app in `niyora-44988` (App ID `1:914374032696:ios:8b78b96f836012165015cd`, bundle `com.niyora.app`) and pulled `GoogleService-Info.plist` (tracked in repo root; prebuild copies it into `ios/Niyora/`). AppDelegate gets `FirebaseApp.configure()` + App Check via the plugin.
   - **Static-frameworks gotcha, fixed:** RNFirebase 26 resolves firebase-ios-sdk via SPM, which collides with `use_frameworks! :static` (duplicate symbols). Fix = `disableSPM: true` on the app plugin (adds `$RNFirebaseDisableSPM = true` to the Podfile so Firebase resolves via CocoaPods instead). EAS runs the same `pod install`, so this is required there too, not just locally.
   **What's left (Neha's console, then a build):**
   - Enable **Firebase AI Logic** with the **Vertex AI** backend; turn on billing (Blaze). Register **App Check** for the iOS app with the **App Attest** provider.
   - Build (dev client or EAS). `ios/` + Pods are already generated locally.
   - Delete `EXPO_PUBLIC_GEMINI_API_KEY` from the EAS envs and **rotate that key** (it shipped in build ≤28, extractable).
   - In dev, App Check prints a debug token to the native log — register it in the console once. Enforcement is a console toggle; leave OFF until the build is verified, then turn ON.
   Note: `proxy/` is now SUPERSEDED (no backend) — safe to delete, kept for now. `.easignore` still excludes it from the app build.

> Accounts note (2026-08-11): Firebase Auth + Firestore were briefly added, then REVERTED — the app is local with no sign-in, and email/Google auth both require one. Only AI Logic + App Check remain (they need no account). The Firebase **project is `niyora-44988`** and `.firebaserc` pins it, which the gate-#1 plist pull reuses.

2. **Privacy hardening (it's a mental-health app).**
   - PII scrub (`src/lib/pii.ts`) still lets BARE standalone names ("Sarah slapped me") and SHORT numbers (<10 digits) through to Gemini. Self-intro names ("my name is X") + relation names + emails + 10-15 digit phones ARE scrubbed. Real fix = a first-name gazetteer or (better) do the scrub server-side in the proxy. Note: with the proxy, PII never hits Google directly anyway — reconsider the whole scrub story then.
   - Need a **privacy policy** URL + honest App Store data-disclosure answers. Good story: entries/emotions stored on-device only, AES-encrypted with an iOS Keychain key, no analytics SDKs, only the (to-be-proxied) AI call leaves the device.
   - The launch checklist (`docs/launch-checklist.md`) has marked privacy "done" prematurely TWICE — do a real pass, don't trust the checkboxes.

3. **Crisis + DV safety, verified end-to-end.** Keyword floor (`crisis-scan.ts`) + AI layer (`classifyCrisis`) + DV screen exist. For this category, verify resources are correct (per region), the escalation is right, and nothing slips. High liability — deliberate review before strangers use it.

4. **Stability / a real testing cycle.** The reflect redesign + memory features are days old and bugs are still surfacing hourly. Needs a round of internal testing to settle before public. No analytics, so lean on testers + TestFlight feedback.

5. **App Store review reality.** Mental-health apps get extra scrutiny: no medical claims, the "not a therapist" framing must be clear, crisis handling, age rating, data practices. Review ~1-3 days but this category can bounce on the above.

## Loose ends / polish (not gates, but visible)
- **Constellation badge ART** is not in the repo — My Soul shows lit-star constellation NAMES as a placeholder (see `EmotionsCard` in `src/app/(tabs)/you.tsx`, the single swap-point). The 19 PNGs are still being sourced (docs/moon-ai-constellations.md).
- **`.easignore`** — the EAS upload was 1 GB. Add one excluding `proxy/`, `ios/build/`, logs, etc. to speed builds (don't exclude `ios/` itself — bare workflow needs it).
- Thread pickup does NOT inject prior context into the echo/acknowledge beat (would corrupt its grounding vet) — open if wanted.
- Planned-actions ("save for later") + moment-history are stored but the Today-tab surfacing / re-read UI is still a follow-up.

## Realistic shape
Weeks, not days: internal test → fix what testers hit → proxy + privacy + crisis pass → submit. Gating item = the proxy; slowest = the crisis/privacy pass.

## Key files
- `proxy/` — the key-proxy backend (deploy target).
- `src/lib/moment-gemini.ts` — the single Gemini egress (point at proxy).
- `src/lib/pii.ts` — the scrub.
- `src/lib/secure-box.ts` + `src/store/moment-history.ts` — on-device encrypted memory.
- `src/lib/crisis-scan.ts`, `classifyCrisis` in moment-gemini.ts — crisis.
- `eas.json`, `app.config.js` — build/dist config.
- `docs/launch-checklist.md` — the older checklist (treat its ticks skeptically).
