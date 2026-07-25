# Phase 03: High-arousal lane (angry / anxious / overwhelmed)

Routed here **silently** from the feeling she picked at 1.5, there is no "which lane?" question. She's flooded, so the job is to bring the body down before any thinking. Flooded people can't reframe, which is why regulation comes first and the CBT beat comes after. See `_legend.md` for schema and invariants.

**Spec:** `moment-flow.yaml` → `lanes:` HIGH (`high_breathe`, `high_more`, `high_reward1`, `high_howlong`, `high_onebreath`, `high_stepaway`, `high_pick_activity`, `high_activity_context`, `high_timer_end`, `high_cbt_stem`, `high_cbt_reframe`, `arousal_check`, `high_ladder`). If a step and its node disagree, **the node wins**.

`make_safe` ("let's make you feel safe") is **not** in this lane, it fires before the split, for all three lanes. See `02-body-check.md` step 2.5.

The precision lines here (the breath count, the don't-send guardrail) are **VERBATIM**. Ship those words exactly.

---

## Step 3.1: Moon breathing 4:6

- **SPEC:** `high_breathe`
- **ROLE:** Bring the body down before anything is asked of her mind.
- **TONE:** Almost wordless. The moon leads by moving, not talking.
- **WHAT TO DO:** Prompt her to breathe out slowly, then run guided 4:6 with the moon's bloom as the pacer. The cue is **VERBATIM: "in for four, out for six"**, never paraphrase the count. Minimal text over the animation.

  **Do not explain why it works.** The count is fine, the mechanism claim is not (voice-bible rule 13). No vagus nerve, no nervous system, no "co-regulation". An earlier version of this brief carried the vagus line, it was banned copy sitting in a doc that teaches writers.
- **AI JOB + COMPONENT:** SCRIPTED-VERBATIM. Component = "breathe out" button, then the full-screen breathing moon. This and the reward are the only places the moon fully blooms. **Fallback:** none, this is model-independent.
- **REWARD:** None mid-breath.

---

## Step 3.2: "want three more?" then light

- **SPEC:** `high_more` → `high_reward1`
- **ROLE:** Let her extend on her own terms, then honour that she stayed with it.
- **TONE:** Gentle offer, zero pressure. Staying or stopping are both fine.
- **WHAT TO DO:** Fixed copy: **"want three more?"** Yes re-runs the 4:6. No moves on. Either way the beat closes with light, no guilt for declining.
- **AI JOB + COMPONENT:** SCRIPTED. Component = yes/no.
- **WHY-LINE:** required and currently missing. One sentence, and keep it honest and small: three more breaths is not a treatment, it's a few more seconds before she does anything.
- **REWARD:** **Yes.** `recordLight`, calm and warm. Soothing, not celebratory.

---

## Step 3.3: "how long have you got?"

- **SPEC:** `high_howlong`
- **ROLE:** Buy her real time away from the trigger, scaled to the day she's actually having so the plan is doable rather than aspirational.
- **TONE:** Practical and kind.
- **WHAT TO DO:** Four options: **no time · 1 to 2 min · 5 min · 20 min.** No judgment on "no time", it just picks the shortest still-real version.
- **AI JOB + COMPONENT:** SCRIPTED. Component = 4-way picker that scales 3.4.
- **WHY-LINE:** required and currently missing. One sentence: what the gap buys her is not sending the thing she'd take back.
- **REWARD:** None here.

---

## Step 3.4: The hold, filled and guarded

- **SPEC:** `high_onebreath` / `high_stepaway` / `high_pick_activity`
- **ROLE:** Give the hold structure so it isn't rehearsal, and hold a firm line against firing off the reactive thing.
- **TONE:** Grounding, containing. The moon is holding the space, a clock ticks quietly so she doesn't have to track it.
- **WHAT TO DO:** **Every branch gets a filler, scaled to its length. Never a bare hold.** An unfilled delay is not neutral: an empty delay is rehearsal.

| her answer | node | what she gets |
|---|---|---|
| no time | `high_onebreath` | one slow exhale + a 30-second filler on the spot: feet flat on the floor, name 3 things you can see, cold hands under the tap |
| 1 to 2 min · 5 min | `high_stepaway` | step away **and** a scaled filler: walk to the window and back, wash your hands, tidy one surface, a lap of the corridor |
| 20 min | `high_pick_activity` | pick an activity, 20-min timer, clock in the corner, tiny checklist (pick / start timer / then respond) |

  **The guardrail is VERBATIM and it is on EVERY branch, not just the 20-minute one:**
  - short branches: **"don't act on this or send anything yet"**
  - 20-min branch: **"don't act on this or send anything till the timer's up"**

  A 30-second hold with no guardrail protects nothing, and 30 seconds is long enough to send a text.

  **The one place a mechanism line IS allowed, on the 20-min branch only** (Bushman 2002, N=600, three conditions), fixed copy:
  > the twenty minutes isn't just waiting.
  > when people are told to sit and stew on what made them angry, they come out angrier.
  > so pick something to do. that's what makes the time work.

  **🔴 DV EXCEPTION:** if the safety screen (see `06-act2-modules.md`) shows any sign of coercive control, fear of a partner, monitoring, escalation or physical risk, **suppress the don't-send line.** We do not know what waiting costs her in that house.
- **AI JOB + COMPONENT:** SCRIPTED-VERBATIM for the guardrail and the Bushman lines, SCRIPTED for the filler sets. Component = activity buttons / checklist / countdown / corner clock, with the guardrail pinned. **Fallback:** none, fully scripted.
- **REWARD:** None mid-hold.

---

## Step 3.5: Why this activity helps her

- **SPEC:** `high_activity_context`
- **ROLE:** The pattern the rest of the flow copies. One line saying why the thing **she** picked helps, grounded in that thing.
- **TONE:** Plain and specific to her pick. Never a general statement about distraction.
- **WHAT TO DO:** One sentence, tied to the activity she chose. **What it does for her, never how it works in her body.** "washing up gives your hands something to do while the spike comes down" ✅, anything with a body part or a system in it ❌. This is the only model-written why-line already in the flow, and it is the template for the ones being added.
- **AI JOB + COMPONENT:** REFRAME. Component = moon line. **Fallback:** a scripted generic line per activity.
- **REWARD:** None.

---

## Step 3.6: Timer ends

- **SPEC:** `high_timer_end`
- **ROLE:** Mark that the body has come down. This is the point where thinking becomes possible again.
- **TONE:** Settled. The storm-has-passed voice, quiet about it.
- **WHAT TO DO:** **"your mind has reached safety."** Near-verbatim, the sentence may flex slightly but the claim may not grow. Then light, then the CBT beat.
- **AI JOB + COMPONENT:** SCRIPTED. Component = moon line + reward bloom.
- **REWARD:** **Yes.** `recordLight`, warm and settling.

---

## Step 3.7: CBT, surface the thought, then warm it

- **SPEC:** `high_cbt_stem` → `high_cbt_reframe`. **Two beats, not one.**
- **ROLE:** Light cognitive work, now that she can think. Multiple choice, not open reflection, because she is still tender and generating is harder than picking.
- **TONE:** Curious and collaborative, never Socratic. Low effort to answer.
- **WHAT TO DO:**
  1. **`high_cbt_stem`:** offer 2 to 3 candidate stuck-thoughts as a multiple choice, drawn from what she actually said. She picks the one that fits.
  2. **`high_cbt_reframe`:** warm the option **she picked** into a smaller, truer read.

  The model warms a meaning she is already holding. It must not invent a new interpretation, diagnose, or prescribe a next step. Rule 17 binds: do not turn her read of someone else's intent into a fact, in either direction.
- **AI JOB + COMPONENT:** REFRAME both beats. Component = MC cards, then a moon line. **Fallback:** scripted MC branches and scripted reframes, so the beat runs model-free.
- **WHY-LINE:** required and currently missing on the stem.
- **REWARD:** None, the light here is gated on 3.8.

---

## Step 3.8: "any better?"

- **SPEC:** `arousal_check`
- **ROLE:** Honest check on whether regulation worked, and the fork between finishing and offering more.
- **TONE:** Direct, caring, no pressure to say yes to please the moon.
- **WHAT TO DO:** Ask plainly whether it's come down. **This is a ROUTING question, not the measurement.** The measurement is the 0 to 10 at the close (`intensity_out`). Don't ask for a number here.
  - **yes** → `ready_reward` → the options menu (06). Not straight to a module.
  - **no** → 3.9.

  Make "no" fully okay. It's information, not failure.
- **AI JOB + COMPONENT:** SCRIPTED. Component = yes/no.
- **⚠️ SPEC FLAG:** the node's `text` is "arousal dropped?", which is not shippable copy, "arousal" fails the dead-simple rule. `meta.why_lines` and `intensity_out` both call this beat "any better?". Using "any better?" here and flagging the mismatch.
- **REWARD:** **On yes only.** `recordLight`. No light on "no", rewarding an unresolved spike would gamify distress. On "no" she gets the offer instead.

---

## Step 3.9: "want to try some other practices?"

- **SPEC:** `high_ladder`
- **ROLE:** When one thing didn't land, offer another. **This is an OFFER, not a ladder.**
- **TONE:** Unfazed, still on her side. No hint that she failed, and no sense that she is climbing anything.
- **WHAT TO DO:** Fixed copy: **"want to try some other practices?"** Then the set, **never repeating the breath she just did**:
  - cold water
  - move your body
  - fix the hunger or thirst
  - box it for ten minutes
  - accept it, and be protected from acting on it

  **She picks. We do not order them and we do not escalate.** The old framing ("escalate up a fixed ladder") implied a hierarchy, and underneath it, that she was failing her way up. It is also more honest as an offer: **none of these have trial evidence.** Where a why-line is written for any of them, say the plain reason, and where the reason is thin, say that it's sensible rather than proven.

  Then loop back to 3.8. The don't-send guardrail persists throughout (with the same DV exception as 3.4).
- **AI JOB + COMPONENT:** SCRIPTED. Component = an option set, then whichever mini-flow she picks. **Fallback:** none, fully scripted.
- **WHY-LINE:** required and currently missing on the offer.
- **⚠️ SPEC FLAG:** `high_ladder` loops back to `arousal_check` with no cap in the spec. Per-stage caps are decided in `NEXT.md` but not written into the spec, so this loop is currently unbounded on paper.
- **REWARD:** Only via 3.8 when it finally reads yes. No light for trying another option.
