# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Before opening a PR: run the checks and fix failures

CI runs `npm ci && npx tsc --noEmit && npm run lint && npm test`. Run that locally and make it green before pushing. Do not open a PR that is red.

## Recurring pitfalls (these have failed CI repeatedly)

1. **`StyleSheet.absoluteFillObject` does not exist on this SDK's StyleSheet type** (TS2551 typecheck error). Use explicit props `{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }` inside a style object, or `StyleSheet.absoluteFill` when passing a single style value (not when spreading).

2. **`react-hooks/set-state-in-effect` is an ERROR here, not a warning.** Calling `setState` synchronously inside a `useEffect` fails lint. Prefer deriving the value during render. If it is an intentional prop-to-state sync guarded by a ref (so it cannot cascade), add `// eslint-disable-next-line react-hooks/set-state-in-effect` with a one-line reason.

3. **Changing dependencies requires regenerating the lockfile.** CI's `npm ci` fails if `package.json` and `package-lock.json` are out of sync (`Missing <pkg> from lock file`). After adding/removing any dependency (including local `file:` modules), run `npm install` and commit `package-lock.json`.

Lint has ~33 known pre-existing warnings; those are fine. CI only fails on **errors**, so the bar is zero lint errors, clean `tsc`, passing tests.
