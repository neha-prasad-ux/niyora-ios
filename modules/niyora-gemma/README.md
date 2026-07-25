# niyora-gemma

On-device **Gemma** (LiteRT-LM / MediaPipe `LlmInference`) for the Rough Moment
CBT session. It is the twin of `niyora-fm`: a deliberately dumb native transport
(text in → text out) with all protocol content and output parsing in TypeScript.

Why Gemma alongside Apple Foundation Models: Gemma needs **no Apple Intelligence
and no A17**, so it works on the A16 test phone that FM can't.
`ReflectModel` (`src/lib/reflect-model.ts`) prefers Gemma, falls back to FM, then
to the scripted session.

> **Correction (2026-07-25): this file used to say "Gemma runs on the GPU". It
> does not, on this path.** MediaPipe `.task` on iOS is **CPU-only**: the GPU is
> not exposed through the C API (Google's own sample is labelled "Gemma 3 1B
> CPU"). See `ai-briefs/export-decisions.md`. GPU is a reason to move to
> LiteRT-LM + `.litertlm` (Route B), not a property we have today. The same false
> claim still sits in two source files and needs fixing there too:
> `src/lib/reflect-model.ts` (app) and `modules/niyora-gemma/src/index.ts`.

## ✅ Runs on device (verified 2026-07-25)

Neha's iPhone 15 (iPhone15,4, A16), iOS 26.5.2, 5687MB physical memory. Debug
build, team `865S8DL9Y9`. Measured twice, in two separate runs.

| check | result |
|---|---|
| `com.apple.developer.kernel.increased-memory-limit` | **present** in the built app's embedded entitlements (development profile regenerated 2026-07-25 after enabling "Increased Memory Limit" on the `com.niyora.app` App ID) |
| MediaPipe actually linked | **yes, not the `#if canImport` stub**: the `GemmaEngine` symbol (only defined inside the `canImport` branch) plus 788 `LlmInference` symbols in `Niyora.debug.dylib` |
| `.task` in `Bundle.main` | 2991MB (3,136,226,711 bytes), not truncated |
| `availability()` | `available` |
| `prewarm()` | **true. 17518ms cold, 696ms on a subsequent load** |
| **a generated token** | *"Reply with exactly one short sentence: what colour is the sky on a clear day?"* → **"The sky on a clear day is blue."** 3421ms (run 1), 3693ms (run 2) |
| `os_proc_available_memory()` | 3638MB before prewarm, **3030MB with the engine resident**, so the engine cost ~608MB against a 2991MB file: the weights are memory-mapped, not fully charged to the app footprint |

**Scope of that result, stated narrowly on purpose:** it covers the **untuned**
`gemma-3n-E2B-it-int4.task` on the **MediaPipe** path only. It says nothing about
Gemma 4 E2B (`.litertlm`, a different file and a different loader, still only ever
seen in Google's AI Edge Gallery), nothing about tuned weights (none have been on a
phone), and **nothing about output quality, grounding, voice or safety**: the
prompt was a trivial non-clinical smoke prompt chosen only to prove tokens come
out. The memory figure was read in a probe screen, not during a real session with
the full UI, and the latency figures are ~10 output tokens on a 512-token context
budget, not a p50 or p95 for real turns.

## Model

- **File:** `gemma-3n-E2B-it-int4.task` (~3GB) — keep this name in sync across
  `src/index.ts` (`GEMMA_MODEL_FILENAME`), `ios/NiyoraGemmaModule.swift`
  (`kModelResource`), and `scripts/fetch-model.mjs`.
- **Memory (the A16 story):** E2B previously jetsam-OOMed on the A16 test phone
  under iOS's default per-app memory cap, so for a short while we **bundled an
  untuned 1B into local dev builds instead**. It never reached a user (the whole
  AI path is gated behind `EXPO_PUBLIC_REFLECT_AI=1`, and store builds leave it
  unset), and it was never our fine-tuned 1B: **nothing tuned has ever been on a
  phone.** (This bullet used to say "we briefly shipped a 1B", which read as a
  release and contradicted "the 1B never shipped" in four other docs.)
  We dropped it because
  the 1B is too weak for open reflection: it hallucinates. The app now declares the
  **`increased-memory-limit` entitlement** (`app.json` → `ios.entitlements`) so a
  6GB device (iPhone 15) can hold the full E2B. **Answered 2026-07-25: it holds.**
  With the engine resident the process still had 3030MB available, no jetsam, so
  the Gemma 2 2B int4 (~1.3GB) fallback is not needed for the probe case. It stays
  on the shelf until a real session with the full UI is measured.
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

**`available` is not proof that inference works.** It reports that the file is in
the bundle; it does not load the engine. Only `prewarm()` proves the weights fit,
and only `generateText()` proves a token comes out. All three were checked on
2026-07-25 (above), which is why that counts as a pass.

## Verify-on-device checklist (needs A16+ hardware)

- [x] **Go/no-go: does the ~3GB E2B stay resident on the A16 WITH the
      increased-memory-limit entitlement, or does it still jetsam-OOM?**
      **GO, 2026-07-25.** It stays resident: 3030MB still available to the process
      with the engine loaded, no jetsam, and a token came out. Measured in a probe
      screen, so re-check it during a real session before calling it settled. The
      Gemma 2 2B int4 (~1.3GB) fallback is not needed for now.
- [x] **A token generated on device, 2026-07-25.** See the verified table at the
      top of this file. Untuned model, smoke prompt, runtime only.
- [ ] Cold-start latency of the first turn after `prewarm()` — tune
      `GEMMA_MAX_CONTEXT` / `maxTokens` if it exceeds the 5s `MODEL_TIMEOUT_MS`.
      **First numbers, 2026-07-25: `prewarm()` 17518ms cold and 696ms warm, then
      3421ms / 3693ms for a ~10-token generation.** The generation figure is
      already close to the 5s timeout and the cold prewarm is far past it, so this
      box stays open: prewarm off the critical path, and re-measure on real turns.
- [ ] Confirm the `.task` bundle's prompt template matches the composed prompt;
      if Gemma echoes turn tokens or ignores the JSON directive, adjust
      `composeGemmaPrompt` / the MediaPipe session config (no rebuild needed for
      the prompt side). **Not answered by the 2026-07-25 run**, which used a bare
      smoke prompt, not the composed CBT prompt.
- [ ] Output quality, grounding, voice and safety on real turns. **Completely
      untested.** The 2026-07-25 prompt was "what colour is the sky on a clear
      day?", chosen only to prove tokens come out.
- [ ] Same run, but in a real session with the full UI up, to see whether the
      3030MB headroom survives it.
- [ ] App size / TestFlight upload (Wi-Fi-only install above 200MB).
