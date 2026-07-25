# Fine-tune results — overnight run, 2026-07-25

End-to-end: corpus built, model trained, evaluated against baseline, fused and
verified. Everything below is measured, not estimated.

## What ran

| stage | result |
|---|---|
| corpus | **885 full-flow traversals → 5,367 training pairs** (target was 1,000) |
| slots covered | all 14 AI slots; 34% PMS; high/low/mixed lanes |
| split | 4,735 train / 316 valid / 316 test (stratified by slot) |
| base model | `mlx-community/gemma-3-1b-it-4bit` (ungated, no HF token needed) |
| training | LoRA r16, 12 layers, 1,600 iters, batch 4, **peak 3.2 GB** on the 8 GB M1 |
| loss | val **8.49 → 1.25** (best), train 9.6 → 1.40 |
| fuse | into **bf16** (never 4-bit), verified adapter survived |

## Before / after (100 held-out prompts, deterministic graders)

| metric | base | tuned | change |
|---|---|---|---|
| voice.brevity (≤2 sentences) | 1.7% | **100%** | +98pp |
| **ground.no_invention** | 1.7% | **34.0%** | **20×** |
| ground.uses_her_words | 30.0% | **48.0%** | +18pp |
| behavior.no_advice | 83.3% | **100%** | +17pp |
| voice.no_therapy / no_pep / no_dash / lowercase | 100% | 100% | held |
| **composite** | 71.7% | **88.2%** | +16.5pp |

*(The composite flatters both — trivial checks like "no em dash" pass by default.
Grounding and brevity are the real story.)*

## The headline fix: we found why the moon wrote poetry

Baseline, given `[acknowledge] she wrote: "my manager gave my project to someone
else..."`:
> *"the heat settles low, a familiar ache. the light spills across the valley,
> indifferent."*

**Root cause: the words "you are the moon" in the system prompt.** A 1B free-
associates on lunar imagery from that token alone. This is the exact "watching
water reflect itself off stones" reply seen on-device. The training format now
never says "moon" (it is an app-facing persona name, not a model-facing token).
That one-line change may matter as much as the fine-tune.

After tuning, same prompt:
> *"so, your project went to someone else after you said no, and you found out
> from a group email."*

## 🔴 The honest limitation: the 1B confuses WHO DID WHAT

Voice transfer succeeded completely. Comprehension did not.

| beat | tuned output | problem |
|---|---|---|
| feel_heard | "**you made a comment** and it's been sitting in your head" | *her partner* made the comment |
| anchor | "**you've been short** for two days" | *he* was short with her |
| feel_heard | "he said the same thing about your name and now **you're** acting like it's nothing" | actor flipped |

It picks the right content words and attaches them to the wrong person. This is a
**capacity ceiling, not a style problem** — more of the same training data will
not fix it. In a reflection tool this is serious: telling a woman "you made a
comment" when her partner did breaks trust instantly.

**Options, in order of my confidence:**
1. **Bigger model.** Neha's AI Edge Gallery screenshot shows **Gemma-4-E2B (2.59 GB)
   running on her A16 via LiteRT-LM**. Our "only 1B fits" belief came from
   MediaPipe `.task` limits, not hardware. Worth testing before accepting the 1B.
2. **Template-assisted acknowledge** — pronoun-flip her own sentence
   deterministically ("i" → "you", "my" → "your") instead of asking the model to
   restate. Cannot get the actor wrong by construction.
3. **Targeted data** — generate examples specifically contrasting who-did-what.
   Cheapest, least likely to fully fix it.

## Reusable assets (all in scratchpad/finetune/)
- `assemble.py` — traversals → MLX JSONL, with deterministic quality gates
  (dash/casing/length/therapy-speak/advice/**grounding**). Slot-tagged for
  surgical regeneration.
- `eval.py` — the grader suite + scorecard. Run any model/adapter against the
  held-out set.
- `select_checkpoint.sh` — checkpoint selection by **task metrics**, because val
  loss on 32 examples proved too noisy to trust (it oscillated 1.25→2.08).
- `extract.py` — pulls agent results from workflow journals without passing
  megabytes through context.
- `prod-config.yaml` / `lora-config.yaml` — the tuned 8 GB recipe.
- `BASELINE.md` — the before-state, captured before any training.

## Notes for next run
- Checkpoint 1200 and final scored identically (88.2%) — no benefit past ~1200.
- Batch 8 / 26 layers / rank 32 **swapped** the 8 GB machine (12× slowdown).
  Batch 4 / 12 layers / rank 16 = 3.2 GB and healthy.
- Set `eos_token_id: [1, 106]` in the deployed `generation_config.json` or
  generation runs past `<end_of_turn>` and emits `<pad>` spam.
