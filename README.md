# Niyora (iOS, v1)

The Niyora iPhone app. Standalone v1. No accounts, no cloud, nothing leaves the device.

> Calm in 60 seconds.

Built with **Expo + React Native + TypeScript** (SDK 56). The older `niyora/ios` repo (`NiyoraCompanion`, SwiftUI companion to Mac) is unrelated; this is the new standalone phone app.

See [DESIGN.md](DESIGN.md) for the visual, interaction, and tonal language. Every PR that touches the app surface should justify itself against that document.

## Project layout

```
ios-v1/
├── DESIGN.md             source of truth for look and feel
├── app.json              Expo config (bundleId, splash, orientation)
├── package.json
├── src/
│   ├── app/              expo-router file-based routing
│   │   ├── _layout.tsx   single Stack, no header
│   │   └── index.tsx     home screen
│   ├── components/       Orb, BeginButton, Header, BackgroundGradient
│   ├── models/           Technique data
│   └── theme/            colors.ts, typography.ts
└── assets/               icons, splash images
```

## Run it

Requires Node 18+ and the Expo Go app on a physical iPhone, OR the iOS Simulator (Xcode 15+).

```sh
cd ios-v1
npm install            # one-time
npx expo start         # opens the dev server, scan the QR with the Expo Go app
```

Or run directly in the iOS Simulator:

```sh
npx expo start --ios
```

## E2E testing (Maestro)

[Maestro](https://maestro.mobile.dev) flows live in `.maestro/`. Five flows cover the full user journey with per-step screenshots.

**Requirements:**

- Maestro CLI: `brew tap mobile-dev-inc/tap && brew install maestro`
- An iOS Simulator booted (`xcrun simctl list devices | grep Booted`)

**Step 1 — build a Release binary (required; flows must not rely on Metro):**

```sh
npm run build:ios:release
```

This runs `expo run:ios --configuration Release`, which embeds the JS bundle into the native build and installs it on the booted simulator.

**Step 2 — run all flows:**

```sh
maestro test .maestro
```

Screenshots for each step are written to the Maestro test output directory (default: `~/.maestro/tests/<timestamp>/screenshots/`).

**Run a single flow:**

```sh
maestro test .maestro/03_session_exit_button.yaml
```

**Flows at a glance:**

| File | What it covers |
|------|---------------|
| `01_home.yaml` | Launch; assert orb screen, technique name, Begin button |
| `02_cycle_technique.yaml` | "Try a different one" cycles the technique twice |
| `03_session_exit_button.yaml` | Begin session; exit via the X / chevron-down button |
| `04_session_exit_swipe.yaml` | Begin session; exit via swipe-down gesture |
| `05_my_soul.yaml` | Open My Soul from header; assert level + sessions; back to Home |

## Current scope

v1, first pass: **home screen only**.

- Header (person + wordmark + speaker)
- Pulsing orb (5.5s ease-in-out)
- Technique name + subtitle (rotates via "Try a different one")
- BEGIN button (haptic + visual press feedback)

Wired but not yet implemented in this pass:

- BEGIN button taps don't navigate anywhere (session screen lands next)
- Person icon doesn't open My Soul (sheet lands next)
- Speaker icon toggles state but no audio yet

## TestFlight / EAS Build (maintainer steps)

Config is in `eas.json`. Two build profiles are defined:

- **production** — Release build uploaded to App Store Connect / TestFlight. `buildNumber` auto-increments each run.
- **preview** — internal-distribution Release build for ad-hoc device testing without the App Store.

### One-time setup (requires credentials)

```sh
# 1. Log in to your Expo account
npx eas-cli login

# 2. Log in with your Apple ID (prompts during first build if skipped)
#    EAS will ask for Apple Team ID and ASC App ID at submit time.
```

### Build and submit

```sh
# Build for TestFlight (production profile)
npm run build:ios

# Submit the latest build to TestFlight
npm run submit:ios
```

`eas submit` will prompt for **Apple ID**, **ASC App ID** (from App Store Connect), and **Apple Team ID** on first run. These are not stored in the repo.

### Out of scope in this repo

- Creating the App Store Connect app record.
- Running `eas build` / `eas submit` (needs Apple Developer credentials).

---

## Tooling notes for future agents

- `expo-router` v6: import everything from `expo-router`, never directly from `@react-navigation/*`.
- `expo-symbols` for SF Symbols. iOS only. If we add Android, pass a `{ ios, android }` object to `name`.
- Reanimated v4 worklets are the default. The orb pulse uses `useSharedValue` + `withRepeat(withTiming(...))`.
- No global state library in v1. `useState` and props are enough for the home screen scope.
- Dark mode only. `app.json` forces `userInterfaceStyle: "dark"`.
- Portrait only. Locked in `app.json`.
