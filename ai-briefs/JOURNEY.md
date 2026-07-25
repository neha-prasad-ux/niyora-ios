# The journey: what we did, what we learnt, what we changed

A record of the in-the-moment AI work — 2026-07-24 to 2026-07-25. Written so the
reasoning survives the decisions, including the parts where we were wrong.

---

## What we built

| | |
|---|---|
| **Spec** | `moment-flow.yaml` — the canonical flow, every node with an id, kind, and rationale |
| **Voice** | `voice-bible.md` — 17 hard rules, each traceable to a finding |
| **Code** | `src/v3/in-the-moment-content.ts` (engine) + `src/app/in-the-moment.tsx` (chat screen) + a dev-gated "Moment" tab |
| **Corpus** | 885 full-flow traversals → **5,304 training pairs** across 14 AI slots, ~115 parallel agents with adversarial critics + deterministic gates |
| **Model** | LoRA on `gemma-3-1b-it-4bit`, 1600 iters, peak 3.2GB on an 8GB M1 |
| **Eval** | `eval.py` — deterministic graders for voice, grounding, advice, safety |

---

## The five discoveries that changed the product

### 1. The word "moon" was making the AI write poetry
Given `[acknowledge] she wrote: "my manager gave my project to someone else…"`,
the raw 1B replied:
> *"the heat settles low, a familiar ache. the light spills across the valley,
> indifferent."*

Root cause: **the token "moon" in the system prompt.** A 1B free-associates on
lunar imagery from that word alone. This was the exact "watching water reflect
itself off stones" reply seen on-device.
**Fix:** no model-facing string ever contains "moon". It is an app-facing persona
name only, now enforced by a jest guard. One word, possibly worth as much as the
fine-tune.

### 2. Fine-tuning fixed the voice and could not fix comprehension
Measured on 100 held-out prompts:

| | base | tuned |
|---|---|---|
| brevity (≤2 sentences) | 1.7% | **100%** |
| grounding (no invented facts) | 1.7% | **34%** |
| no advice | 83% | **100%** |
| composite | 71.7% | **88.2%** |

But the 1B still **swaps who did what** — "you made a comment" when her partner
did. That is a capacity ceiling, not a data problem. Which led to the ELIZA
insight: reflection needs *rearrangement*, not intelligence.

### 3. Structure beats open chat — and we measured it
24 simulated ChatGPT-style transcripts, blind-scored:

| | open chat | our flow |
|---|---|---|
| reframes at turn 1 | **100%** | never (post-break only) |
| gives advice | **100%** | 0% |
| conversation ends | **8%** | 100% |
| invites more talk | **100%** | 0% |
| words per episode | **1,176** | ~20/reply |

Transcripts showed chat repeatedly pushing a *flooded* woman toward **acting** —
drafting confrontation texts, "apologise today". The opposite of what the
regulation literature prescribes.
Corroborated by published work (GUIDE beat an LLM chat control; a state-machine
bot was rated *more human-like* than unguided LLM) and by two independent
convergences: **Sonia** built a finite-state CBT machine; **Character.AI**
retreated to a structured format after five lawsuits.

### 4. Checking the flow against the research found a safety inversion
Suicide deaths **+26%** and attempts **+17% at menstruation**, vs +13% admissions
premenstrually. Our cycle-aware design would have **raised attention in the luteal
window and relaxed exactly as risk peaks.**
**Fix:** the crisis scan is always-on, every cycle phase, and errs toward firing.

### 5. The danger was never the transcript — it was the generated advice
The option generator can produce *"say it to him directly"* — and **the more
dangerous her partner, the more likely that gets generated**, because an abusive
situation reads as ordinary interpersonal conflict.
**Decision (Neha): the app never guides in a DV situation. Detect → stop → hand
off. That is the only path.**
And the reframe that dissolved the hard part: **CUES** — give the resource to
everyone, so detection only ever *suppresses advice* (safe to do badly) rather
than *gating help* (not safe to do badly).

---

## What we changed, and why

| change | why |
|---|---|
| **Day-14 hold removed** | rested on one n=23 study that never tested what we advised; and *plain postponement fails* — only a scheduled worry-window works |
| **"De-weight the swing" removed** | told her not to trust her own read. Zero evidence, and we might talk a woman out of an accurate threat perception |
| **Escalation ladder → "want to try some other practices?"** | "ladder" implies she's failing her way up it; and none of it has trial evidence, so offering beats prescribing |
| **Controllability fork → a menu** | as a clinical judgement it needed evidence we don't have; as *asking her what she wants* it needs none. Same screen, honest framing |
| **Every hold branch got a filler** | an unfilled delay is rehearsal — people told to sit and stew came out **angrier** |
| **"Don't act or send" on every branch** | 30 seconds is long enough to send a text |
| **Body check now acts** | "can you eat now?" → go do it. We were deferring the one intervention that works immediately |
| **Tired changes the timing** | you can't nap on demand; name the cost, let her choose |
| **Reach-out reframed** | talking through an upset produced **no recovery at 3d/7d/2mo** — it only worked when the listener helped her *think* |
| **Self-compassion → tone, not technique** | halves against active controls, near-null in apps |
| **Repair says it straight** | apologising helps the *recipient*; it may not help her — and intending-then-not-doing is worse than never planning to |
| **Close line changed** | "i'm around whenever you need me" is **attachment language**, the mechanism named across the Character.AI complaints |
| **Crisis scan every message** | Wysa: **82% of crisis instances came from detection, 18% from the user asking.** We were scanning only the opening line |
| **Transcript stays ephemeral** | reverses the earlier "persist + draw a line" call. Chayn: *"don't auto-save on the user's end"* — and it was never built, so reversing cost nothing |
| **Entry asks "tell me what happened"** | pulls for an event, not a feeling — fewer thin entries |
| **Crisis resources named** | saying "not a crisis line" and naming nowhere is *the* documented failure |

---

## Where we were wrong (kept deliberately)

Six corrections, every one found by adversarial checking rather than by the
author. The pattern: **confident numbers ran ahead of verification, and always in
the direction of more support than existed.**

1. **d = 0.91 → 0.53** for implementation intentions (0.91 is against the wrong comparator)
2. **95% abuse history → ~40–60%** (the 95% figure is n=42)
3. **"The controllability fork is evidence-backed"** — it rests on one cross-sectional N=170 study measuring an *ability*, about *reappraisal* not acceptance
4. **Self-compassion "has self-guided evidence"** — it halves against active controls and app trials are near-null
5. **Comparing our SPEC to competitors' measured reality** — our table scored us 100% on a string that doesn't exist in the codebase
6. **Inventing a "sister"** in a hand-written gold-standard walkthrough — while building guards against exactly that. It led to the `invented_person` gate, which then found **63 invented people already in the training corpus** (mom ×13, kids ×13, manager ×8…)

---

## What we know, and what we don't

**Well-evidenced:** intensity gating (**75–80% of the variance** in what works),
regulate-before-reframe, filled delays, 4:6 = exactly 6 breaths/min, behavioural
activation, affect labeling, if-then plans, and **unguided assertiveness
(ES≈1.00, unguided ≈ guided)** — the best answer to the self-guided question.

**Weak or unevidenced:** DESC (zero trials, from a 1976 trade book), "boundaries"
and "grey rock" (zero), reach-out (contrary signal), cold water/TIPP (nothing
found), the mixed lane's interventions.

**The honest top line:** **more rigorously examined than anything shipping in this
category, and still unproven.** Competitors have fabricated RCTs and uncited "50%
reduction" claims; we have real citations, correctly sequenced, with the weak ones
labelled. But good citations for components are not evidence the assembly helps —
the Tessa lesson exactly: a real N=700 RCT, deployed to a population it was never
validated for.

The only thing that closes it: **8–12 women, within-subject, pre-registered.**

---

## Model state (read this before touching the fine-tune)

- **We trained the 1B** (`gemma-3-1b-it-4bit`), fused into bf16, verified.
- **The fused model never shipped.** `modules/niyora-gemma` is configured for
  `gemma-3n-E2B-it-int4.task` — **untuned E2B**.
- **So the app currently runs an untuned model, and our tuned model isn't on the
  phone.** That inconsistency is unresolved.
- **Recommended target: Gemma 4 E2B** — ungated, trains locally (~4GB peak), 607MB
  on iOS, prebuilt `.litertlm` at 2.588GB, and already verified running on the
  test phone. Gotcha: Gemma 4 shares KV across layers 15–34 and mlx-lm skips
  missing keys **silently** — use `[q_proj, o_proj, gate_proj, down_proj]`, and
  `fuse --dequantize` (bf16 is 10.24GB, won't fit).
- **Never fuse into a 4-bit base** — it silently discards the entire adapter, with
  no error, and the model still talks fluently enough to pass a smoke test.

See `NEXT.md` for the ordered next steps.
