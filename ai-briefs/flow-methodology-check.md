# Is the flow the right methodology? — cross-check against the real evidence base

Neha supplied the actual citations behind the Mural flow (2026-07-25). This is
the validation that matters; my earlier audit checked `research.db`, which is a
PMS/women-at-work bank and simply does not contain the regulation literature.
**Correction to that audit: "0 papers" was a fact about the bank, not a verdict
on the flow.**

Original verdict: the spine is right, and four specific beats were wrong.

**STATUS AS OF 2026-07-25, after re-reading the spec node by node:**

| gap | status | where |
|---|---|---|
| GAP 1 controllability routing | ⛔ **REJECTED**, not fixed. The evidence does not carry it | `controllability` + the SUPERSEDED HEADER above it |
| GAP 2 plain postponement | ✅ **CLOSED** (with two caveats, read them) | `time_it` |
| GAP 3 if-then under-implemented | ✅ **CLOSED** | `today_action`, `uncontrollable_ifthen` |
| GAP 4 unfilled holds | ✅ **CLOSED** | `high_onebreath`, `high_stepaway` |
| the three overclaiming copy lines | ✅ closed in the spec and the voice bible, ⚠️ **open in the training corpus** | see that section |

So nothing in this doc is an open methodology gap any more. What is still open is
**the corpus** (Stream D2) and **the build** (Streams A/B), plus the validity risk
at the bottom, which no spec edit can close.

`moment-flow.yaml` is the single source of truth. Where this doc and the spec
disagree, the spec wins and this doc is the thing to fix.

---

## ✅ VALIDATED — the architecture is well-chosen

| flow decision | evidence | verdict |
|---|---|---|
| intensity gate; regulate BEFORE reframe; small-vs-big split | Sheppes 2011 — at high intensity distraction beats reappraisal, at low intensity reappraisal works | **correct, and non-obvious**. Putting CBT *after* the break (not before) is exactly right |
| no-vent; break filled with distraction | Bushman 2002 + 2024 anger meta (154 studies) | **correct.** Venting rehearses anger |
| the naming beat | Lieberman 2007 — affect labeling lowers amygdala activity | **correct** |
| 20-minute break, "don't act now" | Gottman flooding / DPA | **correct** |
| 4:6 breathing | slow-breathing meta 2022, on the ~6 breaths/min pace | **correct: 4+6 = 10s = exactly 6/min.** The *pace* is the evidence-backed part. The physiology is not ours to claim, in this doc or in the app: keep the count, drop the mechanism (`voice-bible.md` rule 13) |
| LOW lane = activation, not calming | behavioural activation for anhedonia RCT | **correct** |
| counter-the-critic (shame) | self-compassion meta + Ferrari 2019 | **DOWNGRADED 2026-07-25.** This cell said *"one of the few with self-guided evidence"*. Not supportable: it beats doing nothing, but roughly **halves against an active comparison**, and app-delivered versions come out near-null. The spec demoted it from a technique to **TONE** (`uncontrollable_selfcompassion`): never label it, never explain it, never claim it. The comfort act that follows does the real work |

---

## ⛔ GAP 1, controllability ROUTING: proposed, then REJECTED (2026-07-25)

**Status: rejected. Do not restore it, and do not re-raise it as a gap.**
Kept here only so the reasoning survives.

**What was proposed.** Specker/Sheppes 2024 + Bonanno regulatory flexibility were
read as: match strategy to context, reappraisal helps when the situation is
uncontrollable and *hurts* when it is controllable. On that reading the flow
routed only by arousal (high / low / mixed) and was missing an architectural
fork after regulation: uncontrollable → feel/accept/anchor, controllable →
act/plan/draft. It was ranked priority 1 in this doc.

**Why it was rejected.** The evidence does not carry it. It rests on **one
cross-sectional N=170 study**, it measures an **ability** rather than an
outcome, it is about **reappraisal** rather than acceptance, and the largest test
since found **INTENSITY dominates**, not controllability. Intensity is what we
already route on. So the fork would have been a clinical judgement made about her
life on the strength of a single cross-sectional study.
This was one of the six corrections in JOURNEY.md → "Where we were wrong": *"the
controllability fork is evidence-backed"* was not true.

**What the spec does instead** (`moment-flow.yaml` → `controllability`, and the
🔴 SUPERSEDED HEADER immediately above it, which exists to stop exactly this
argument coming back). Same screen, honest framing: it is a **MENU she picks
from, not a diagnosis we make about her.** We show 3 specific, small,
situation-grounded acts drawn only from what she told us, plus *"show me some
others"* and *"none of these feel possible right now"*. Asking her what she wants
needs no evidence, because it is consent rather than a clinical claim. The copy
says so out loud: there is never one right move.

**What survived from the original argument, and is genuinely in the spec:**
- the beat runs **after** regulation and **before** Act 2 (she must be calm before
  she plans or drafts anything, and it is never asked while flooded)
- an act-shaped path and an acceptance-shaped path both exist, but **she** chooses
  between them, we do not sort her into one
- the "nothing feels possible" path is a full path, not an exit: honor the refusal
  with no persuading, one tiny comfort act, a COPING if-then, door left open

**Two design constraints that came out of the rejection, both load-bearing:**
- **Never ask an open "can you do something about this?".** A woman who is low or
  depleted answers no every time; that is the depressive cognition answering, not
  the situation. Picking from concrete options is far lower effort than generating
  one, and mid-low is the worst possible moment to ask her to self-assess agency.
- **The ladder rule:** the three chips are always direct → preparatory →
  self-directed, rung 3 always present, never three confrontational options.

## ✅ GAP 2: CLOSED at `time_it` (spec, 2026-07-25)

The gap as written: McGowan & Behar 2013 says a **scheduled worry-window has
evidence and plain postponement fails clinically**, while `time_it` offered
"today" or "let it wait / hold until ~day 14" and then nothing.

**Closed by `moment-flow.yaml` → `time_it`.** Verified by reading the node:
- the **~day-14 hold is REMOVED**. Two reasons recorded there: the day-14 number
  rested on a single n=23 observational study that compares early- vs
  late-follicular and never tests the luteal vs late-follicular contrast we were
  actually advising; and plain postponement is the version that fails.
- the branches are now `now` and **`scheduled_return`**, the second carrying
  *"a concrete agreed window, never a vague later"*.
- the short delay is kept and separated from deferral: the 20-min break before
  acting stays (Gottman flooding/DPA; regulate-before-reframe). Delay to
  regulate, yes. Defer for days, no.

**Two honest caveats, not reasons to reopen it:**
1. What the spec schedules is the **return to the action**, not a worry-window in
   McGowan & Behar's sense (a set time to worry). It fixes the plain-postponement
   failure the gap identified; it is not the same intervention as the citation.
   Say "we schedule the return", never "we use a worry-window".
2. `scheduled_return` and `now` both route to `today_action`, and **no node
   captures the agreed window** (no picker, no reminder, no stored time). The rule
   is specified, the mechanism is not. That is a build question for Stream B, not
   an unclosed methodology gap.

## ✅ GAP 3: CLOSED at `today_action` (and `uncontrollable_ifthen`)

The gap as written: Webb/Gollwitzer 2012 implementation intentions regulate
affect at **d = 0.53** against the fair comparator (goal intentions), by Neha's
own note *"the single biggest lever"*, and the flow had reduced it to a
today/wait chip pair. A timing choice is not an if-then plan, so we were taking
a fraction of the available effect from the strongest tool we have.

> **THE NUMBER. Corrected 2026-07-25, and it keeps coming back.**
> **d = 0.53, k = 29, N = 1,208, versus goal intentions.** That is the fair
> comparator, because our alternative is never "she does nothing", it is "she
> intends to handle it".
> **0.91 is STALE.** It is the effect against no-regulation-instruction controls
> and it overstates what we add. **0.65 is also STALE**, and it never had a
> citation attached. If you find 0.91 or 0.65 in any doc, it is wrong.

**Closed by `moment-flow.yaml` → `today_action`.** Verified by reading the node:
it is now an explicit IF-THEN with two fill slots (trigger, response), *"if he
brings it up at dinner, then i say ___"*, stored as her Today action, written
only after she is calm. **She fills both slots, not the model**, because
self-generated intentions work better and the model cannot invent a person that
way.
Also closed on the other branch: **`uncontrollable_ifthen`** gives the
"nothing feels possible" path a **coping** if-then rather than a fixing one
(*"if i start spiralling at 2am, then i get up and make tea instead of
scrolling"*), so she leaves with the same shape as everyone else.

⚠️ One inconsistency inside the spec, flagged rather than resolved:
`today_action` says she fills both slots, while `uncontrollable_ifthen` is typed
`kind: ai-draft` with model-written examples. Both cannot be right. See "Where
the spec still contradicts itself" at the bottom.

## ✅ GAP 4: CLOSED at `high_onebreath` and `high_stepaway`

The gap as written: Gottman, heart rate resets in ~20 min **only with active
distraction**; Bushman, an unfilled delay is rehearsal, i.e. rumination. Only the
20-minute branch had an activity. The no-time / 1–2 min / 5 min branches issued
the hold and went straight to CBT with nothing to do, which is most sessions
taking the risk without the mitigation.

**Closed in `moment-flow.yaml`.** I traced all four branches of `high_howlong`
and every one is filled:
- `no_time` → **`high_onebreath`**: one slow exhale plus a 30-second filler she
  can do on the spot (feet flat on the floor, name 3 things you can see, cold
  hands under the tap). "Never a bare hold."
- `min_1_2` and `min_5` → **`high_stepaway`**: step away AND a scaled filler
  (walk to the window and back, wash your hands, tidy one surface, a lap of the
  corridor). "Never a bare hold."
- `min_20` → **`high_pick_activity`**: pick an activity, 20-min timer, corner
  clock, checklist. The branch that already had one.

Two things the fix picked up beyond the original gap:
- the verbatim **"don't act on this or send anything yet"** now sits on **every**
  hold branch, not just the 20-minute one. 30 seconds is long enough to send a
  text, so a hold with no guardrail protects nothing.
- `high_pick_activity` carries a `science_copy` line saying why the time needs
  filling, one of the few claims we can actually make (Bushman 2002, N=600,
  three conditions): people told to sit and stew came out angrier.

The HIGH lane is the only lane with a hold, so filling these four closes it.
One deliberate exception to keep in view: the DV rule **suppresses** the
don't-act line where there are signs of coercive control, because we do not know
what waiting costs her in that house. That is a decision, not a regression.

---

## Copy that overclaimed: fixed in the spec, partly still in the corpus

All three are closed as spec/voice questions. Two are still live as **corpus**
questions, because the docs were fixed and the training data was not.

- **`naming_science`** (✅ closed everywhere). The old line was *"research says people who describe
  feelings with precise words rather than generic ones cope better."* Lieberman
  2007 supports *labeling*; precise-vs-generic is emotional **granularity**
  (Barrett), which Neha flags as textbook rather than a citation we hold, and
  "research says" in front of an unheld claim is the thing to avoid. **Softened in
  the spec 2026-07-25** to *"putting words to a feeling actually settles it down a
  bit. that's the whole reason we start here."* Claims only labeling, drops the
  appeal to authority. **Corpus: 0 instances of "research says".**
- **breathing rationale** (✅ spec, ⚠️ corpus). The ~6/min *pace* is the solid
  part. *"longer exhale = the fastest lever on the vagus nerve"* is a mechanism
  claim we do not hold. Keep the count, drop the mechanism. Now banned outright by
  `voice-bible.md` rule 13, and the spec's `high_breathe` carries only the
  verbatim *"in for four, out for six"*. **Corpus: 56 examples still contain
  vagus / "burns off the adrenaline" wording. Stream D2 drops them.**
- **crying** (✅ spec, ✅ corpus). Gračanin 2014: crying self-soothes **only**
  when it leads to comfort or reappraisal, and otherwise worsens mood as
  rumination-crying. A generated PMS scenario said *"if the crying keeps coming,
  let it, that moves the feeling through"*, which **prescribes** crying as
  beneficial. Now `voice-bible.md` rule 12: **permit, never prescribe.**
  **Corpus: 0 prescribed-crying lines**, because the gates caught them, so there is
  nothing to regenerate here. Do not repeat the old "regenerate the crying lines"
  instruction; it was written from the seed files, not from the JSONL.

**The corpus numbers, verified against the JSONL rather than inferred from the
seed files (2026-07-25).** Total is **5,304 pairs** (4,678 train + 313 valid +
313 test, line-counted). **5,367 is the PRE-GATE number**, and the 63-pair gap is
exactly the `invented_person` gate. Known liabilities: the removed `deweight`
slot (120) and the physiology lines (56), so Stream D2 drops roughly 176
examples, not thousands. Clean at 0: day-14 hold, attachment closes, "research
says", prescribed crying, "tell one person".

---

## The real validity risk (Neha's own flag, and she is right)

**Almost all of this evidence is therapist-delivered; our app is self-guided on a
phone.** The directions are well-grounded; *"it works unguided"* is the untested
leap. Known self-guided evidence: **unguided assertiveness (ES ≈ 1.00, unguided
≈ guided)**, which is the best answer we have to the self-guided question; DBT
skills app (mixed on distress tolerance); internet CBT for PMS (guided, not
self-guided).
**Self-compassion was listed here as holding self-guided. Removed 2026-07-25:**
it halves against active controls and app trials are near-null, so it is tone
in our flow, not a claimed intervention.

EFT attachment-injury work is **therapist-only** — our honest-talk beat borrows
the *frame* and must never imply it delivers the therapy.

**Recommendation:** tag the corpus and any future harvest `self-guided vs
guided`, and never let a therapist-delivered result become a hard in-app claim.

---

## Priority order

**The old list is void.** It ranked controllability routing at 1, and that
routing was rejected. GAPs 2, 3 and 4 are closed in the spec, and the three copy
lines are fixed in the spec and the voice bible. What is left is not methodology:

1. **Build the if-then** (`today_action`), the largest documented effect in the
   flow at **d = 0.53**, specified and not yet in code. Stream B.
2. **Build the options menu with the safety screen as a precondition of
   generation**, not a filter after it. Highest-risk item in the product.
   Stream B.
3. **Drop the ~176 stale corpus examples** (120 `deweight`, 56 physiology).
   Stream D2.
4. ~~**Prove one token generates on device** before any further model work.~~
   **DONE 2026-07-25.** The untuned `gemma-3n-E2B-it-int4.task` generated a token
   on the A16 (`prewarm()` 17518ms cold / 696ms warm, generation 3421ms and 3693ms
   across two runs, 3030MB still available with the engine resident). Runtime only:
   smoke prompt, untuned model, MediaPipe `.task` and not Gemma 4 `.litertlm`,
   nothing measured about quality. Next in Stream D is stock Gemma 4 E2B in our own
   app, which has still never run there.
5. **8–12 women, within-subject, pre-registered.** The only thing that closes
   the validity risk above. Prediction to confirm or kill: chat wins "felt
   understood", structure wins "didn't send it" and 24h rumination.

---

## Where the spec still contradicts itself (for Neha, not for me to settle)

Found while verifying the four gaps. None of these changes a gap verdict.

1. **`moment-flow.yaml` does not parse as YAML.** The `memory:` block (a mapping)
   was inserted in the middle of the `act2:` sequence, so `act2_intro` onward is
   orphaned: a parser errors at `- id: act2_intro` with "bad indentation of a
   mapping entry". Anything that reads the spec as data reads it wrong, or not at
   all. Presentation bug rather than a content one, but it is the single source
   of truth.
2. **Who fills the if-then slots.** `today_action` says *"SHE fills both slots,
   not the model"*. `uncontrollable_ifthen` is typed `kind: ai-draft` and shows
   model-written examples. WORKPLAN Stream B repeats the she-fills rule. If the
   rule holds, `uncontrollable_ifthen` is the wrong kind.
3. **The `nothing` exit skips the measurement.** In `act2_module`, the branch
   `{when: nothing, module: none, next: close}` jumps straight to `close`, past
   `we_good`, past `intensity_out` and past the human nudge. That contradicts
   "the ending, settled" (both branches converge) and it silently loses the
   in/out intensity delta for whoever takes it, which is the measure.
4. **`deweight` corpus count.** `voice-bible.md` says *"~124 examples"*; WORKPLAN
   Stream 0 and SESSION-PROMPT say **120**. 120 is the count taken from the
   JSONL, so the ~124 looks like the outlier, but nobody has re-run it.
5. **Two split figures for the corpus.** `finetune-results.md` gives
   "4,735 train / 316 valid / 316 test" (= 5,367, pre-gate) directly under
   "4,678 + 313 + 313" (= 5,304, post-gate), with only the second labelled. Both
   are right; only one is the trained set. Worth labelling the first.
6. **Gemma 4 E2B size.** `NEXT.md` and `JOURNEY.md` both say "607MB on iOS,
   prebuilt `.litertlm` at 2.588GB". Those two numbers are not reconciled
   anywhere, and the download size is the one that matters for shipping.
