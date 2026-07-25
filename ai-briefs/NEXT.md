# Where we are and what's next

Handoff written 2026-07-25 at the end of a long session. **The spec is far ahead
of the code** — that gap is what everything below closes.

> ## ✅ 2026-07-25: the on-device gate PASSED
> The bundled **untuned** `gemma-3n-E2B-it-int4.task` generated a token on Neha's
> iPhone 15 (A16): `availability()` = `available`, `prewarm()` true (17518ms cold,
> 696ms warm), smoke prompt answered in 3421ms and 3693ms across two runs, 3030MB
> still available to the process with the engine resident. MediaPipe confirmed
> genuinely linked, not the `#if canImport` stub.
> **Narrow claim only.** Untuned model, trivial non-clinical prompt, nothing
> measured about quality or grounding, memory read in a probe screen rather than a
> real session, latency on ~10 output tokens. **Gemma 4 E2B (`.litertlm`) still has
> not run in Niyora**, and nothing tuned has ever been on a phone.
> Detail: `WORKPLAN.md` → STREAM D → STEP 0.

---

## DECIDED but NOT YET IN CODE

### The first message (approved copy, Neha's own edit)

> in the middle of anger, tears, spiraling, or nothing at all, sometimes it's hard to think what to do. i'll give you a few options that actually help, and you pick.
>
> i'm an ai, not a doctor, a therapist, or a crisis line. and i'm not someone to vent to for an hour, that tends to keep it burning. we do it differently here.
>
> if you're in real trouble right now, call or text 988. outside the us, findahelpline.com.
>
> what you write stays on your phone and goes when you close it.

Why each line is shaped that way:
- The four states name our three lanes, so every woman finds herself. **"or nothing
  at all"** is the one that catches the numb woman who'd think this isn't for her.
- **"i'm an ai"** is a legal requirement, not a nicety (California SB 243, in force;
  EU AI Act Art. 50(1) from 2 Aug 2026). The "it's obvious" exception is weak for a
  personified moon.
- **NO efficacy claim.** An earlier draft said *"it is proven that women who manage
  their emotions better manage PMS better"* — that single sentence would reclassify
  Niyora as a **medical device** in the EU and UK. PMS/PMDD is the landmine for a
  cycle app. Say WHEN it's useful, never what it does to a named condition.
- **"options that actually help"** is a claim about METHOD, not outcome. Safe side.
- Implementation: show **988 as plain text, never a tap-to-dial link** (call logs +
  carrier billing are surveillance surfaces an abuser can reach; she can't delete
  the bill). Never IP geolocation — locale as a guess with a visible picker.

### The acknowledge tiering (Neha's catch: "what if the sentence isn't bad? am hungry")

Acknowledge earns its place **in proportion to how much she said.** Echoing four
words back is the ELIZA parody and makes the app sound stupid.

| her input | beat |
|---|---|
| thin / no event ("idk", "everything") | **clarify** — ask for the concrete thing |
| short and clear ("he didn't call") | **SKIP acknowledge** — straight to feelings. She knows we read it; there was nothing to miss |
| rich and detailed (several facts) | **acknowledge** — reflecting it back proves we read it |

### The clarify gate (approved)

Replace the one-shot thin/not-thin classifier with a **loop**: does the moon have
enough concrete detail to reflect specifically? If not, ask again.
Borrowed from Sonia's semantic gating — their own finding was that syntactic rules
*"alone prove insufficient"* for knowing whether a stage actually worked.
**This is the one place worth paying for an extra model call** (~2s of silence on
device); it attacks grounding, our worst metric at 34%.

### Per-stage caps (the safety belt for that loop)

We have ONE global cap (30 turns) and nothing per beat. Any beat that can repeat
needs its own limit — e.g. clarify gets **2 tries, then proceed with what we have**.
Otherwise she can go ten rounds on one question while upset. Deterministic, no model.

### The deterministic echo — WORTH TESTING, not yet decided

ELIZA (1966) achieved grounded reflection with pattern matching and **could not
hallucinate**, because it only rearranged the user's own words.

Proposal: split acknowledge into two jobs.
1. **Template (deterministic):** pronoun-flip her sentence → facts are correct BY
   CONSTRUCTION. No invented sister, no flipped actor.
2. **Model:** adds one short warm clause only.

Not a fallback (catch failures after the fact) but a **floor** (never give the model
the job it fails). Rationale: fine-tuning fixed tone completely (brevity 1.7→100%,
no-advice 83→100%) but comprehension stalled at 34% **on general data** — *NOT a proven capacity ceiling;
   that phrasing was retracted. We never trained against the specific failure. See
   WORKPLAN Stream D2*.
**Next step: run echo vs model on the held-out set, compare grounding AND how it
reads.** ~20 minutes, produces a number.

---

## THE ORDER

### Phase 1 — make what ships safe and honest (hours)
1. **The crisis resource.** Still a `TODO(safety-spec)` in `CRISIS_HARD`. It is a
   safety gap, the documented category failure (15.2% of harmful chatbot crisis
   responses gave no specific resource), AND a California precondition to operating
   with a **private right of action**. Needs Neha's sign-off on which services.
2. First message into the app.
3. Clarify gate + per-stage caps.
4. Acknowledge tiering.

### Phase 2 — build the missing spine
5. **The options menu WITH the safety screen as a precondition.** Biggest real
   danger: the generator can produce "say it to him directly" into a home we know
   nothing about, and the more dangerous her partner the more likely that gets
   generated.
6. **Universal DV resourcing (CUES)** — give the resource to everyone, framed "for
   you or someone you know". Then detection only ever SUPPRESSES advice, never gates
   help — and that job is safe to do badly. Handoff must render on a **non-persisted
   surface**, never as a message in the conversation.
7. **If-then Today action** — biggest documented lever (d=0.53) currently reduced to
   a today/wait chip.

### Phase 3 — measurement
8. Intensity 0–10 at entry **and close — twice, not three times** (the mid-flow
   "any better?" is routing, not measurement) + a **24h "did you do it?"**.
   Collect self-report, but **trust the behavioural measure** — people reported
   feeling better after venting while showing zero actual recovery.

### Phase 4 — the only thing that settles it
9. **8–12 women, within-subject, pre-registered.** Prediction to confirm or kill:
   *chat wins "felt understood"; structure wins "didn't send it" and 24h rumination.*

### Running separately
- **The on-device runtime gate is CLOSED (passed 2026-07-25)**, so the model track
  is unblocked. What was proven is only that the untuned `.task` model loads and
  generates on the A16 inside Niyora. See the box at the top of this file.
- **Gemma 4 E2B** — ungated, trains locally (~4GB peak), 607MB on iOS, prebuilt
  `.litertlm`. The path to fixing comprehension rather than working around it.
  **It has still never run inside Niyora**: the 2026-07-25 pass was the MediaPipe
  `.task` model, a different file and a different loader, so proving stock Gemma 4
  in our app is still a step of its own.
  Gotcha: Gemma 4 shares KV across layers 15–34, and mlx-lm skips missing keys
  **silently** — use `[q_proj, o_proj, gate_proj, down_proj]`, and `fuse --dequantize`.
- Echo-vs-model experiment (above).

---

## DECIDED 2026-07-25 (was open, now closed — don't re-litigate)

- **On-device inference is no longer an open question.** The gate passed on the
  phone (box at the top of this file). The narrow version of the claim is the only
  one to repeat: untuned `.task` model, smoke prompt, runtime only.
- **Anthropomorphism: a warm voice, not "someone."** The deliberate middle of the
  three options. The testable line: **the voice may REACT to what she just said;
  it may not have standing feelings, needs, or a bond that persists after she
  closes the app.** Full rule + ✅/❌ table at the top of `voice-bible.md`.
  Load-bearing mitigations that keep this safe: the flow ends, nothing persists,
  no attachment language, never claims to be human or licensed. If any of those
  four go, reopen this.
- **The ending is settled.** Both branches (picked-an-act / none-feel-possible)
  converge on: something concrete → an if-then → `we good?` → intensity out →
  frequency-gated human nudge → close. Traced against the spec, not assumed.
  Full shape in `WORKPLAN.md` → "The ending, settled".
- **The tired question moved** from `body_tired` to `time_it` — at the body check
  she hasn't chosen an act yet, so "now or tomorrow?" was timing an action that
  didn't exist. Stream A owns the move.
- **Crisis scan runs on EVERY message**, not just the entry, and never relaxes by
  cycle phase. Menstruation is not a safe window.
- **WHY-LINES are required at every choice point** — Neha: *"the text to connect
  buttons (actions) to why is missing throughout."* `activity_context` was the
  only one we had. See `moment-flow.yaml` → `meta.why_lines` (16-item inventory)
  and **WORKPLAN STREAM G**.

## STILL OPEN — Neha's calls, not mine
- **Which crisis services to name.** (Drafted: 988 + findahelpline.com.)
- **DESC**: keep the act (assertiveness is our best-evidenced act, unguided ES≈1.00)
  but never write a science line claiming DESC itself is evidenced — it has zero
  trials and comes from a 1976 trade book.
- **"boundary" wording** in the bias module → replace with the evidenced version:
  "say no to the specific thing", "don't reply tonight", "leave at 6 like you planned".

## NOT NEEDED
- **LangGraph.** We already have a state machine, transitions are mostly tap-driven
  and deterministic, and it's server-side orchestration for a React Native app.
  Borrow Sonia's vocabulary, skip the dependency.

## READ FIRST in a new session
`moment-flow.yaml` (the spec) · `voice-bible.md` (17 hard rules) ·
`finetune-results.md` · `flow-methodology-check.md` · `act-evidence-review.md` ·
`selfguided-evidence-findings.md` · `dv-safety-findings.md` ·
`regulatory-findings.md` · `failure-cases.md` · `competitive-findings.md`
