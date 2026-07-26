# Getting the fine-tuned model onto the phone — findings + decisions

Researched 2026-07-25 while the corpus/fine-tune ran. These are load-bearing:
two of them would have silently shipped a broken model.

> ## 🔴 READ THIS FIRST — three claims below were MEASURED FALSE on 2026-07-25
>
> This doc chose Route B (a LiteRT-LM Swift rewrite, ~2-3 days, Early Preview
> API, broken simulator). All three reasons it gave have now been tested on
> device, and all three failed. **Route B may still be right, but not for any
> reason written below.** Do not re-derive it from this file.
>
> | claim in this doc | measured |
> |---|---|
> | "`.task` on iOS is CPU-only, GPU isn't exposed through the C API" | **Reasoning false, conclusion right.** `MediaPipeTasksGenAI 0.10.35` declares `LlmPreferredBackend` with a GPU case and Swift exposes `preferredBackend`. Asking for GPU **hangs indefinitely** (>16 min, no error, no timeout). So there is no usable GPU, but not because it is unexposed. |
> | "MediaPipe exports Skia symbols globally → `EXC_BAD_ACCESS`; we are exactly the colliding case" | **Did not reproduce.** One binary carried ~31k Skia symbols and ~800 `LlmInference` symbols. The real `BreathingParticles` (Atlas, `useTexture`, per-frame callback) rendered for 2.5s with a resident Gemma engine. No crash, twice. |
> | Implicit: we need LiteRT-LM in order to load a `.litertlm` | **False.** `gemma-4-E2B-it.litertlm` (2468MB) loads in **MediaPipe on iOS**: `prewarm → true` in 4398ms. The ".task only" note in the C header sits inside an `__EMSCRIPTEN__` block, so it constrains Web, not iOS. |
>
> **The one REAL argument for Route B**, found the same day and not in this doc:
> `MPPLLMInference` is declared
> `SWIFT_DEPRECATED_MSG("Migrate to LiteRT LM instead")` in the shipped header.
> The MediaPipe path works but is officially end-of-life. That is a strategic
> reason, not a technical blocker, and it should be argued on its own terms.
>
> **Also measured:** `gemma-4-E2B-it-web.task` (1910MB) does NOT load
> (`Unable to open zip archive`) — the web build is not a valid MediaPipe
> bundle. And Gemma 4 **does not terminate** yet: it answers correctly and then
> emits turn tokens to the cap. See "Gemma 4 turn format" at the bottom.

## 🔴 CRITICAL: never fuse a LoRA into the 4-bit base

`mlx_lm.fuse` against `gemma-3-1b-it-4bit` **silently discards the entire
adapter**. The LoRA delta is ~0.026 of the 4-bit quantization step, so it rounds
away to nothing. No error is raised. Measured in mlx-lm PR #1564; issue #1172
found 0/139 behaviour retained when fused into 4-bit vs 95-100% when the adapter
is served separately.

The failure mode is nasty: every downstream step succeeds, and the shipped model
still talks fluently, so it **passes a smoke test while being completely
untrained**. We would have concluded "fine-tuning didn't help" and blamed the data.

**Rule:** train against the 4-bit base (cheap, fits 8GB), but fuse into
`mlx-community/gemma-3-1b-it-bf16` (ungated; `google/gemma-3-1b-it` is gated).
`--model` and `--adapter-path` are independent, and LoRA shapes are
quantization-independent, so this is legal.
**Gate:** before anything downstream, compare a temp-0 decode from
adapter-served vs fused. If they diverge, the fuse ate the adapter.

## ~~🔴 MediaPipe `.task` is the wrong destination for this app~~
## ⚠️ SUPERSEDED 2026-07-25 — both disqualifiers tested, both failed

Kept for the record, struck through, because the reasoning is what keeps coming
back. Original text:

1. ~~**`.task` on iOS is CPU-only.** GPU isn't exposed through the C API~~
   **PARTLY WRONG.** GPU *is* exposed (`LlmPreferredBackend`, and
   `preferredBackend` on the Swift `Options`). It just hangs: no result in over
   16 minutes, no error, no timeout, process alive. CPU on the same build and
   the same process worked fine. So: do not ask for GPU on this path, and do not
   repeat the reason. The correct statement is "GPU is selectable and
   non-functional", which is a different and more dangerous fact, because an
   unsuspecting caller gets a hang rather than an error.
   → The "Gemma runs on the GPU" claim in the README and
   `modules/niyora-gemma/src/index.ts` was still wrong and is now **fixed** in
   both, plus `src/lib/reflect-model.ts`.
2. ~~**`MediaPipeTasksGenAI` exports Skia symbols globally**, causing
   `EXC_BAD_ACCESS` in apps that link Skia~~
   **DID NOT REPRODUCE.** Tested directly rather than inferred: one binary with
   ~31k Skia symbols and ~800 `LlmInference` symbols, rendering the real
   `BreathingParticles` (Atlas + `useTexture` + `useRSXformBuffer`, per-frame)
   for 2.5s with a ~2.5GB Gemma engine resident. No crash, on two runs, on
   iOS 26.5.2 / A16.
   Honest limits of that test: 2.5s of rendering, one device, one OS, not under
   memory pressure, and not a full breathing session. It weakens the claim
   substantially; it does not prove the collision can never happen.

Also confirmed: MediaPipe LoRA *serving* only supports Gemma-2 2B / Gemma 2B /
Phi-2, never Gemma-3 1B. But that's moot — every viable route fuses first, which
is strictly better anyway (all layers, not just attention).

## ⚠️ Decision: Route B — REOPENED 2026-07-25, argue it on the real reason

The three axes below no longer hold as written: `.litertlm` loads in MediaPipe
on iOS, there is no usable GPU on either path yet, and the Skia collision did
not reproduce. What survives is one thing the original text did not mention:
**`MPPLLMInference` is `SWIFT_DEPRECATED_MSG("Migrate to LiteRT LM instead")`.**
Building on a deprecated runtime is a real cost; it is just not the cost this
doc argued. Re-decide on that basis, not the one below.

Original text follows.

## ✅ ~~Decision: Route B — LiteRT-LM Swift + `.litertlm`~~

Wins on three independent axes: it's the only path to **Metal GPU** on iOS,
`export_hf` is a one-command export from a fused HF dir, and it drops MediaPipe
(and therefore the Skia collision). Package.swift declares iOS 15+ so no
deployment-target bump; Expo modules can declare SPM deps from the podspec via
`spm_dependency`. Native surface is ~3 functions / ~120 lines → 2-3 days.

Costs, honestly: the Swift API is Early Preview (~2 months old), the **simulator
is broken** (device-only iteration), and there's an unresolved iOS init/allowlist
report.

**Insurance policy worth a 2-hour spike:** `mlx-swift-lm` ships
`gemma3_1B_qat_4bit` and loads a local model in one line — **no conversion at
all**, which sidesteps every export risk above.

**Rejected — Route C (switch to Gemma-2 2B):** throws away the Gemma-3 work,
doubles model size, lands on a maintenance-only API, and mlx-lm adapters aren't
PEFT-compatible in any dimension (transposed `lora_A`, different keys, different
scaling).

## Gemma 4 turn format (measured 2026-07-25)

**Gemma 4 changed the turn markers.** Gemma 3 used `<start_of_turn>` /
`<end_of_turn>`. Gemma 4's own `chat_template.jinja` opens a turn with
`<|turn>` + role and closes it with `<turn|>`, and the generation prompt is
`<|turn>model`.

Sent a bare prompt with no turn structure, Gemma 4 answered correctly and then
emitted `<turn|>` / `<eos>` to the token cap: 92 seconds for one sentence.

⚠️ **Writing the markers inline into the prompt string did NOT fix it** and
appeared to make it worse (no result in 14 minutes). That was tried and it
failed; do not retry it as if it were untested. The likely reason: markers in
the prompt tell the MODEL what it is looking at but tell the RUNTIME nothing
about where to stop.

~~The mechanism that should work is `LlmPromptTemplates`~~ (`user_prefix`,
`user_suffix`, `model_prefix`, `model_suffix`) passed at session config, which
is how the engine learns a turn boundary. It exists in the C API
(`MediaPipeTasksGenAIC`) and is exposed by neither Swift surface.
~~So it needs the C API called directly from Swift.~~

> ### ⚠️ CORRECTED 2026-07-26: the C API is not needed
>
> The shipped Swift interface already carries what this needs. From
> `MediaPipeTasksGenAI.framework/.../arm64.swiftinterface`:
>
> - `generateResponseAsync(inputText:) -> AsyncThrowingStream<String, Error>`
> - `Session.cancelGenerateResponseAsync() throws`
>
> So the fix is client-side and in plain Swift: stream the tokens, break at
> `<turn|>`, cancel the generation. No C API bridging, no `LlmPromptTemplates`.
> Anyone planning a multi-day C API detour off the paragraph above should stop.
>
> **Also corrected: the "cap `maxTokens` low (64)" workaround cannot work.**
> `maxTokens` is a *context* cap (input + output), it is applied at warm time in
> `warmLocked`, and it is clamped by `max(256, maxTokens)`. Passing 64 to
> `generateText` on an already-warm engine does nothing at all. Measured: two
> runs at "cap=64" produced 931 and 2038 raw characters, bounded by the
> 512-token context and not by the cap. Any plan resting on that workaround is
> resting on nothing.

### Decode speed, measured 2026-07-26

Both Gemma 4 timings before today were runaways, so tokens/sec was unknown.
It is now bounded, though still not measured precisely:

| | Gemma 4 `.litertlm` | 3n `.task` |
|---|---|---|
| prewarm | 170-718ms | 927ms |
| templated prompt | 110.2s, 2038 raw chars | 2.7s, 41 raw chars |
| bare prompt | 87.3s, 931 raw chars, trims to nothing | 4.0s, 31 raw chars, correct |

Both answered *"The sky is typically blue on a clear day."* when the prompt
carried the right turn markers. Two runs, identical character counts, so the
runaway is deterministic rather than flaky.

⚠️ **Read the rate claim carefully.** Dividing characters by a chars-per-token
guess puts **both** models near 4-5 tok/s, which would mean the entire 40x gap
in that table is termination and not speed. That is an **estimate from character
counts, not a token measurement**, and it is load-bearing enough that it should
not be repeated as fact until the streaming change counts real tokens.

If it holds, it has a consequence beyond Gemma 4: at 4-5 tok/s a 30-50 token
reflection takes 7-11s against a `MODEL_TIMEOUT_MS` of 5s, so the incumbent 3n
has the same problem and the answer is to stream the reflection rather than to
change model.

> ### ❌ That estimate was WRONG. Measured properly later the same day.
>
> The char-based guess put both models near 4-5 tok/s and concluded the whole
> gap was termination rather than speed. **It does not hold.** With
> `Session.sizeInTokens` counting real tokens, three runs each:
>
> | | Gemma 4 `.litertlm` | 3n `.task` |
> |---|---|---|
> | total, templated | 3.8-4.3s | 2.4-3.3s |
> | time to first token | 2.1-2.3s | 1.5-2.3s |
> | **decode after first token** | **~5.5 tok/s** | **~10.4 tok/s** |
> | stop reason, 3/3 runs | `stopMarker` | `eos` |
>
> **3n decodes about 1.9x faster than Gemma 4.** Decode speed therefore *does*
> discriminate between the models, which is exactly what the estimate denied.
> Token counts were identical on every run (11 and 10), so this is deterministic
> rather than noisy.
>
> **The two models also stop for different reasons.** 3n reaches a real `eos`
> every time. Gemma 4 has never once terminated on its own: every run ended
> because the client-side stop cut it at `<turn|>`. That is a dependency, not a
> cure. If a fine-tune shifts Gemma 4's turn behaviour, the marker list has to
> move with it or the runaway comes back.

### The 5s budget, and why neither model comfortably fits

`MODEL_TIMEOUT_MS` is 5s and a reflection is 30-50 tokens. Using the measured
rates, including time-to-first-token:

- **3n:** 1.5-2.3s + 2.9-4.8s decode = **4.4-7.1s**
- **Gemma 4:** 2.1-2.3s + 5.5-9.1s decode = **7.6-11.4s**

⚠️ **That is the optimistic case.** These come from a short smoke prompt.
Prefill scales with input length and the real in-the-moment prompt is far
longer, so TTFT in the actual flow will be worse. It has **not** been measured
there. TTFT is already 40-60% of total time on a trivial prompt, which makes it
the more likely thing to blow the budget, and changing model does not fix it.

So the consequence is a product decision rather than a model one: **stream the
reflection to the screen as it arrives** rather than waiting for a complete
string. A 5s all-or-nothing timeout is the wrong shape for a 4-11s generation,
and the API this was built on already delivers tokens one at a time.

## Smaller traps to remember
- A fused dir won't contain `generation_config.json`; without
  `eos_token_id: [1, 106]` generation runs past `<end_of_turn>` — which looks
  exactly like the "Gemma echoes turn tokens" symptom already in our README.
- int4 via litert-torch's named recipe is channelwise and destroys small models.
  Use `dynamic_int8`.
