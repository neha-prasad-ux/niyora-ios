# Model runtime: `.task` vs `.litertlm`, and what fits on the phone

Written from a fine-tuning session in `~/Claude Workspace/niyora/gemma4-runpod`
so this module's next change does not have to rediscover it. Sources and fuller
detail in that repo's `docs/EXPORT.md`.

## The two runtimes are not interchangeable

This module currently uses **MediaPipe** (`MediaPipeTasksGenAI` /
`MediaPipeTasksGenAIC`, Swift `LlmInference`), which reads **`.task`**.

The fine-tuned models we produce are **`.litertlm`**, which is **LiteRT-LM**.

| | `.task` | `.litertlm` |
|---|---|---|
| runtime | MediaPipe `LlmInference` | LiteRT-LM |
| iOS package | CocoaPod `MediaPipeTasksGenAI` | SPM `LiteRTLM` |
| status | **maintenance-only** | current |

MediaPipe's iOS guide lists only `.bin` and `.task`. Google documents the Gemma
3n/4 `.litertlm` models as ready for **Android and Web**; iOS is absent. Google's
own pages now carry a banner recommending migration to the LiteRT-LM Swift API.

**Consequence: this module cannot load a fine-tuned Gemma 4 as it stands.**

## And there is no way around it by converting

There is **no supported HuggingFace → `.task` path for Gemma 4**. `litert-torch`
`export_hf` emits `.litertlm` only, and MediaPipe's bundler has no Gemma 4 model
type — attempting it fails with `Unknown special model: GEMMA_4_E2B`.

So the choice is real, not a tooling gap to route around:

1. **Move this module to LiteRT-LM Swift.** Unblocks any Gemma 4 / 3n fine-tune
   and moves off a maintenance-only dependency.
2. **Keep MediaPipe and fine-tune a family it still supports** (Gemma 3 1B).
   Smaller and comfortably within device memory, but a much smaller model.

A `gemma-4-E2B-it-web.task` exists in `niyora-models/`. It is a **web**-targeted
artifact and should not be assumed loadable by MediaPipe on iOS.

## LiteRT-LM Swift, if we go that way

    SPM   https://github.com/google-ai-edge/LiteRT-LM
    docs  https://developers.google.com/edge/litert-lm/swift
    min   0.12.0 (first native Swift release); current 0.14.0; iOS 15+
    pod   none — SPM only, vendors a prebuilt CLiteRTLM.xcframework

```swift
import LiteRTLM

let config = try EngineConfig(modelPath: path, backend: .cpu,
                              cacheDir: NSTemporaryDirectory())
let engine = Engine(engineConfig: config)
try await engine.initialize()          // ~10s; keep off the main thread
let convo = try await engine.createConversation()
let out = try await convo.sendMessage(Message(prompt))
```

Two API facts that affect our design:

- **Constrained decoding is `ResponseFormat.json(schema:)` and
  `.regex(pattern:)`** (LLGuidance). There is **no Swift token-suppression API**;
  Lark grammars are C++ only. So the rule "every safety suppression is a list
  operation, never model behaviour" stays a filter over candidates in TypeScript.
  It cannot be pushed down into token suppression.
- **`EngineConfig` exposes `loraRank` / `supportedLoraRanks`**, so LiteRT-LM can
  apply a LoRA adapter at runtime. Worth evaluating: the shipping unit could be a
  **168 MB adapter** over a shared base rather than a multi-GB merged model.

## Memory: the binding constraint, and the published numbers understate it

Google's iOS benchmarks for the 2.58 GB Gemma 4 E2B are on an **iPhone 17 Pro
(8 GB)**: CPU 25 tok/s decode at 607 MB peak, GPU 56 tok/s at 1450 MB peak.

An independent measurement of the larger E4B (3.65 GB) on the same device saw
**~4.65 GB peak** — roughly 5x Google's headline — and a hard `mmap` failure
without entitlements. Google's "peak CPU memory" appears to exclude clean
memory-mapped pages, which jetsam does count.

For our A16 / 6 GB test phone:

- Ship with **both** `com.apple.developer.kernel.increased-memory-limit` and
  `com.apple.developer.kernel.extended-virtual-addressing`.
- Prefer **`backend: .cpu`** on A16. GPU nearly triples peak memory for +31 tok/s.
- A 6 GB device is roughly a **2.5-3.0 GB** per-app budget, community-measured.
  Apple publishes no figure. **Measure on the device before designing around it.**
  Google's own iOS benchmarks stop at 8 GB hardware, so E2B on an iPhone 15 is
  unproven even at 2.59 GB.

### Model size is a recipe choice, not a property of the model

A first export of our fine-tune at `dynamic_wi8_afp32` (uniform INT8) produced
**5.08 GB** — unloadable on a 6 GB phone. Google ships the same model at
**2.59 GB** using a mixed 2/4/8-bit recipe with memory-mapped embeddings. The
closest public recipe is `dynamic_wi4_afp32`, roughly 2.6 GB.

**Pick the recipe from the device budget before exporting**, not from the
exporter default.

## Related

- `src/lib/reflect-model.ts` — the Gemma → FM → scripted fallback chain
- `src/lib/ground-floor.ts` — template floor that builds a reflection from her own
  words by construction, for when a model reply fails the grounding check
- fine-tuning results and the grounding metric: `gemma4-runpod/docs/FINDINGS.md`

## Entitlements, and where they actually belong

`/ios` is **gitignored** — it is generated by `expo prebuild`. So entitlements
must be declared in `app.json` under `expo.ios.entitlements`; editing
`ios/Niyora/Niyora.entitlements` directly works for the current build and is
wiped by the next prebuild.

    "com.apple.developer.kernel.increased-memory-limit": true

That one is granted automatically and is the one that matters: it raises the
jetsam ceiling, which is what a ~2.6 GB memory-mapped model needs. Verified
present in the signed binary with:

    codesign -d --entitlements - --xml Niyora.app | plutil -p -

`com.apple.developer.kernel.extended-virtual-addressing` is deliberately NOT
declared. It fails the build outright:

    error: Provisioning profile "iOS Team Provisioning Profile: com.niyora.app"
    doesn't include the Extended Virtual Addressing capability.

Enabling it is an App ID change at developer.apple.com → Identifiers →
com.niyora.app. It mainly matters for >4 GB address space, which this model does
not need, so it is a nice-to-have. Add it to `app.json` once the capability is
enabled on the account.
