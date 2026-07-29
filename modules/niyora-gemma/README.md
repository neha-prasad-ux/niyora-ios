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
- **Bundled, not downloaded:** the `.task` is embedded in the app binary at build
  time (podspec `resources`), so it is present from first launch and nothing
  leaves the device. It is **never committed to git** (see `.gitignore`).

## Build steps (on your Mac, for a device build)

1. **Fetch the weights** (accept the Gemma license first, then supply a URL/token):
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

4. In the app, open a **Rough moment** ("start fresh") session. If the model is
   bundled and links, turns come from Gemma; otherwise the session silently
   stays scripted.

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
- [ ] Memory footprint with a ~3GB model resident on the A16.
- [ ] App size / TestFlight upload (Wi-Fi-only install above 200MB).
