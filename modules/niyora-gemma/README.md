# niyora-gemma

On-device **Gemma** (LiteRT-LM / MediaPipe `LlmInference`) for the Rough Moment
CBT session. It is the twin of `niyora-fm`: a deliberately dumb native transport
(text in → text out) with all protocol content and output parsing in TypeScript.

Why Gemma alongside Apple Foundation Models: Gemma runs on the GPU with **no
Apple Intelligence and no A17**, so it works on the A16 test phone that FM can't.
`ReflectModel` (`src/lib/reflect-model.ts`) prefers Gemma, falls back to FM, then
to the scripted session.

## Model

- **File:** `gemma-3n-E2B-it-int4.task` (~3GB) — keep this name in sync across
  `src/index.ts` (`GEMMA_MODEL_FILENAME`), `ios/NiyoraGemmaModule.swift`
  (`kModelResource`), and `scripts/fetch-model.mjs`.
- **Memory (the A16 story):** E2B previously jetsam-OOMed on the A16 test phone
  under iOS's default per-app memory cap, so we briefly shipped a 1B — but the 1B
  is too weak for open reflection (it hallucinates). The app now declares the
  **`increased-memory-limit` entitlement** (`app.json` → `ios.entitlements`) so a
  6GB device (iPhone 15) can hold the full E2B. This build is the go/no-go test:
  if E2B still OOMs, fall back to a converted **Gemma 2 2B int4 (~1.3GB)**.
- **Bundled, not downloaded:** the `.task` is embedded in the app binary at build
  time (podspec `resources`), so it is present from first launch and nothing
  leaves the device. It is **never committed to git** (see `.gitignore`).

## Build steps (on your Mac, for a device build)

1. **Fetch the weights** (accept the Gemma license, then supply the E2B URL/token
   you used before — E2B is gated, no ungated mirror):
   ```sh
   cd modules/niyora-gemma
   GEMMA_MODEL_URL='<direct .task url>' GEMMA_MODEL_TOKEN='<hf token>' \
     node scripts/fetch-model.mjs
   ```
   Writes `ios/model/gemma-3n-E2B-it-int4.task`. For EAS, run this from an
   `eas-build-pre-install` hook so CI has the file before archiving.

2. **Install pods** so MediaPipe + the module link in:
   ```sh
   npx expo prebuild -p ios   # if ios/ needs regenerating
   cd ios && pod install
   ```

3. **Turn the AI path on** for this build (store builds leave it unset):
   ```sh
   EXPO_PUBLIC_REFLECT_AI=1 npx expo run:ios --device
   ```

4. In the app, open a model-backed session — a **Rough moment** ("start fresh"),
   or (dev builds) the **"In the moment"** chat via the `AI` pill top-right of
   the Now screen. If the model is bundled and links, turns come from Gemma;
   otherwise the session silently stays scripted.

## Runtime states

`NiyoraGemma.availability()` → `available` (model bundled + MediaPipe linked) ·
`modelNotReady` (module linked but `.task` missing) · `unsupported` (MediaPipe
not compiled in). The JS provider maps anything but `available` to the scripted
session.

## Verify-on-device checklist (needs A16+ hardware)

- [ ] Cold-start latency of the first turn after `prewarm()` — tune
      `GEMMA_MAX_CONTEXT` / `maxTokens` if it exceeds the 5s `MODEL_TIMEOUT_MS`.
- [ ] Confirm the `.task` bundle's prompt template matches the composed prompt;
      if Gemma echoes turn tokens or ignores the JSON directive, adjust
      `composeGemmaPrompt` / the MediaPipe session config (no rebuild needed for
      the prompt side).
- [ ] **Go/no-go:** does the ~3GB E2B stay resident on the A16 WITH the
      increased-memory-limit entitlement, or does it still jetsam-OOM? If it
      OOMs, convert + ship Gemma 2 2B int4 (~1.3GB) instead.
- [ ] App size / TestFlight upload (Wi-Fi-only install above 200MB).
