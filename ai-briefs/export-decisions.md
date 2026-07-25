# Getting the fine-tuned model onto the phone — findings + decisions

Researched 2026-07-25 while the corpus/fine-tune ran. These are load-bearing:
two of them would have silently shipped a broken model.

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

## 🔴 MediaPipe `.task` is the wrong destination for this app

Two independent disqualifiers, both late findings:
1. **`.task` on iOS is CPU-only.** GPU isn't exposed through the C API (Google's
   own sample is literally labelled "Gemma 3 1B CPU").
   → **Our README and `modules/niyora-gemma/src/index.ts` both claim "Gemma runs
   on the GPU". That is false on the current path** and it is part of the stated
   reason we preferred Gemma over Apple FM. Fix the claim regardless of route.
2. **`MediaPipeTasksGenAI` exports Skia symbols globally**, causing
   `EXC_BAD_ACCESS` in apps that link Skia. **Our `package.json` pins
   `@shopify/react-native-skia` 2.6.2** — we are exactly the colliding case.

Also confirmed: MediaPipe LoRA *serving* only supports Gemma-2 2B / Gemma 2B /
Phi-2, never Gemma-3 1B. But that's moot — every viable route fuses first, which
is strictly better anyway (all layers, not just attention).

## ✅ Decision: Route B — LiteRT-LM Swift + `.litertlm`

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

## Smaller traps to remember
- A fused dir won't contain `generation_config.json`; without
  `eos_token_id: [1, 106]` generation runs past `<end_of_turn>` — which looks
  exactly like the "Gemma echoes turn tokens" symptom already in our README.
- int4 via litert-torch's named recipe is channelwise and destroys small models.
  Use `dynamic_int8`.
