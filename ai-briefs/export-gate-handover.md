# Export gate: can we fine-tune Gemma 4 E2B and get it back to `.litertlm`?

Written 2026-07-26 for a parallel session. The other session is doing the
streaming-stop work on the phone. **This one is Mac-only and must stay that way.**

## Why this is the step that decides the model

`gemma-3n-E2B-it-int4.task` runs well on device today: prewarm 927ms, a correct
answer in 2.7s, terminates cleanly. Gemma 4 `.litertlm` also runs and answers
correctly, but takes 110s because it never stops. That gap is a termination bug
and is being fixed separately.

So runtime does not decide this. **Tunability does.** MediaPipe LoRA serving
never supported Gemma-3, and converting a fused Gemma-3 back to `.task` is
unproven, so a 3n we cannot tune is not a candidate no matter how well it runs.
If Gemma 4 can be tuned and exported, Gemma 4 wins by default, and it is also
the only non-deprecated path (`MPPLLMInference` is
`SWIFT_DEPRECATED_MSG("Migrate to LiteRT LM instead")`).

If this gate fails, the model question reopens properly and we test the 3n
export path instead.

## Scope, and the hard boundary

**Do:** everything on the Mac. Training, fusing, exporting, verifying.

**Do NOT:**
- touch the phone, or install anything on a device
- touch `ios/`, `src/app/`, or `modules/niyora-gemma/` in the iOS worktree
- start or restart Metro, the log sink (8099), or the file server (8100)

The other session owns the device and those files. This one owns
`~/code/product/niyora-models/` and whatever scratch dirs you make.

## The deliverable

A `.litertlm` file produced from a deliberately throwaway 20-iteration adapter,
sitting in `~/code/product/niyora-models/`, named so it cannot be confused with
the stock file. Plus an honest verdict on each stage below.

**This is a toolchain test, not a quality test.** Twenty iterations will not
improve anything. The only question is whether the pipeline runs end to end and
produces a loadable artifact. Do not report anything about quality from it.

## Check this first, it may end the gate in ten minutes

**Does mlx-lm load `gemma-4-E2B` at all?** Gemma 4 E2B is a MatFormer-style
model with per-layer embeddings, and that architecture is exactly the kind of
thing a converter supports late or partially. If mlx-lm cannot load it, nothing
downstream matters and we have our answer cheaply. Check this before setting up
any training.

Second unknown, also cheap: **is the HF checkpoint gated?** The prebuilt
`litert-community/gemma-4-E2B-it-litert-lm` is confirmed `gated: false`, but
that is the *converted* artifact. The trainable HF checkpoint is a different
repo and its gating is unverified. Resolve it before planning around it.

## The stages, and the trap in each

1. **Load the base in mlx-lm.** See above. Cheapest disqualifier.

2. **Train a 20-iteration LoRA.** Any small slice of the existing corpus is
   fine; the content is irrelevant here.
   ⚠️ **Target `[q_proj, o_proj, gate_proj, down_proj]`.** Gemma 4 shares KV
   across layers 15-34, so there is no `k_proj`/`v_proj` there, and **mlx-lm
   skips missing keys without warning**. Include them and you get a smaller
   adapter than you think, silently.

3. **Fuse into bf16, never into 4-bit.**
   ⚠️ `mlx_lm.fuse` against a 4-bit base **silently discards the entire
   adapter**: the LoRA delta is ~0.026 of the quantization step and rounds away.
   No error. The model still talks fluently, so it passes a smoke test while
   being completely untrained. Use `fuse --dequantize`.

4. **Gate before going further: temp-0 decode, adapter-served vs fused.**
   If they diverge, the fuse ate the adapter and everything downstream is
   measuring nothing. Do not skip this because stage 3 "looked fine". Looking
   fine is the documented failure mode.

5. **Export with litert-lm's `export_hf`.**
   ⚠️ Use `dynamic_int8`. The named int4 recipe is channelwise and destroys
   small models.
   ⚠️ A fused dir will not contain `generation_config.json`. Without
   `eos_token_id: [1, 106]`, generation runs past the turn end, which looks
   exactly like the runaway symptom we are separately debugging. Do not let that
   confusion into the results.

6. **Structural sanity check on the output.** Compare against the known-good
   stock file: `~/code/product/niyora-models/gemma-4-E2B-it.litertlm`, exactly
   2,588,147,712 bytes. Same container format, plausible size. You cannot load
   it without the phone, and you should not try.

## Reference points measured on device, so you don't re-derive them

| | |
|---|---|
| `gemma-4-E2B-it.litertlm` (2,588,147,712 B) | Loads in MediaPipe on iOS. prewarm 170-718ms. Answers correctly when the prompt carries Gemma 4 turn markers. Does not terminate: ~510 tokens, 110s. |
| `gemma-3n-E2B-it-int4.task` (3,136,226,711 B, bundled) | Loads, answers in 2.7s, terminates. The incumbent. |
| `gemma-4-E2B-it-web.task` (2,003,697,664 B) | Does not load: "Unable to open zip archive". Dead end, do not spend time on it. |
| Decode rate | Roughly 4-5 tok/s on **both** models. **Estimated from character counts, not measured tokens.** A real number is coming from the other session. |
| GPU backend | Selectable and non-functional, hangs >16 min with no error. Never request it. |

## Gemma 4 turn format

Gemma 4 changed the markers. Gemma 3 used `<start_of_turn>` / `<end_of_turn>`.
Gemma 4's own `chat_template.jinja` opens with `<|turn>` + role, closes with
`<turn|>`, and the generation prompt is `<|turn>model`. This matters for any
temp-0 comparison you run in stage 4: compare like with like.

## How to report back

Per stage: did it run, what exactly came out, and what you did not verify.
This project's most expensive recurring failure is a correction landing in one
file and going stale in four others, and its second most expensive is a result
being reported at more confidence than it was measured at. If you inferred
something rather than checking it, say which one you did.

**Write your verdict to `ai-briefs/export-gate-results.md`, a new file, and
nothing else in `ai-briefs/`.** The other session is editing
`export-decisions.md` and `SESSION-PROMPT.md` right now and will merge your
result into them. Two sessions editing the same brief is the precise failure
this project has hit three times, so do not do it here to fix it there.
