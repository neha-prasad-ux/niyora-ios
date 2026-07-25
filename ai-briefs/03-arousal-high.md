# Phase 03 — High-arousal lane (angry / anxious / overwhelmed)

Routed here **silently** from her 1.2 feeling — no "which lane?" question. Her nervous system is flooded; the job is to bring the body down *before* any thinking, then keep escalating strategies until arousal actually drops. Nothing here is optional theater — flooded people can't reframe, so we regulate first. See `_legend.md` for schema + invariants.

The precision lines in this lane (the breath count, the "don't send it" reminder) are **VERBATIM** — ship those words exactly.

---

## Step 3.1 — "Let's make you feel safe"

- **ROLE:** Set the frame that we're going for *safe*, not *fixed*. Signals the moon isn't going to make her explain herself while she's flooded.
- **TONE:** Steady, grounding, low and slow. The calmest voice in the whole flow. Fewer words, more floor.
- **WHAT TO DO:** One short line that the plan right now is just to get her body to safety — no problem-solving yet. Direction only; keep it to one line, no promises it'll all be okay.
- **AI JOB + COMPONENT:** SCRIPTED intent; SENTENCE may be AI-written (one line) with fixed fallback ("let's just get you feeling safe first — nothing to solve yet"). Component = moon line + a single primary button leading into the breath.
- **REWARD:** None — regulation hasn't happened yet.

---

## Step 3.2 — Breathe out slowly (button) → moon breathing 4:6

- **ROLE:** The physiological reset. A longer exhale than inhale is the fastest lever on the vagus nerve; the moon breathes *with* her so she's co-regulating, not performing.
- **TONE:** Almost wordless. The moon leads by moving, not talking.
- **WHAT TO DO:** Prompt her to breathe out slowly, then run guided 4:6 breathing with the moon's visual bloom as the pacer. The cue is **VERBATIM: "in for four, out for six"** — never paraphrase the count. Minimal text over the animation.
- **AI JOB + COMPONENT:** SCRIPTED-VERBATIM (the count is a precision line). Component = "breathe out" button → the breathing moon (4:6), the one place besides reward where the moon fully blooms. **Fallback:** none — this is fixed, model-independent.
- **REWARD:** None mid-breath; reward lands after the round at 3.3.

---

## Step 3.3 — "Want 3 more?" → reward

- **ROLE:** Let her extend the reset on her own terms, then honor that she stayed with it.
- **TONE:** Gentle offer, zero pressure. Staying or stopping are both fine.
- **WHAT TO DO:** After the first round, offer three more breaths (direction: simple yes/no offer). Whichever she picks, close the breath beat with light. No guilt if she declines more.
- **AI JOB + COMPONENT:** SCRIPTED. Component = yes/no; yes re-runs the 4:6 moon, no advances to the break. Reward bloom on completion.
- **REWARD:** **Yes** — `recordLight`, calm and warm, affirming she breathed with it. Tone stays soothing, not celebratory.

---

## Step 3.4 — Break: "how long have you got?"

- **ROLE:** Buy her nervous system real time away from the trigger, scaled to her actual availability so the plan is doable, not aspirational.
- **TONE:** Practical and kind. Meeting her where her day actually is.
- **WHAT TO DO:** Ask how much time she has, four options, each scaling the break that follows: **no time · 1–2 min · 5 min · 20 min**. Direction: no judgment on "no time" — that just picks the shortest, still-real version.
- **AI JOB + COMPONENT:** SCRIPTED. Component = 4-way picker that sets the scale of 3.5 (activity + checklist + timer length).
- **REWARD:** None here (reward lands when the timer completes, 3.6).

---

## Step 3.5 — Pick activity + short checklist + timer + "don't act/send"

- **ROLE:** Give the break structure so she doesn't just sit and ruminate, and hold a firm guardrail against firing off the reactive thing while flooded.
- **TONE:** Grounding, containing. The moon is holding the space; a clock ticks quietly so she doesn't have to track it.
- **WHAT TO DO:** Offer a scale-appropriate activity, a **short** checklist for it, a timer matching her 3.4 choice (up to 20 min), and a clock in the corner. Carry the reactive-action guardrail, **VERBATIM: "don't text him"** (or the scripted general form **"don't send it / don't act on it yet"** when there's no specific target). Direction: the checklist is tiny and concrete; the guardrail line is fixed and non-negotiable.
- **AI JOB + COMPONENT:** SCRIPTED-VERBATIM for the guardrail; SCRIPTED for the activity/checklist set. Component = activity buttons + checklist + countdown timer + corner clock + the pinned "don't send it" reminder. **Fallback:** none — fully scripted.
- **REWARD:** None mid-break.

---

## Step 3.6 — Timer ends → reward "your mind has reached safety"

- **ROLE:** Mark that the body has come down — the transition point where thinking becomes possible again.
- **TONE:** Settled, quietly proud of her. The storm-has-passed voice.
- **WHAT TO DO:** When the timer completes, tell her her mind's reached safety (direction; the intent is fixed, sentence may vary) and give light. Then move to the CBT beat.
- **AI JOB + COMPONENT:** SCRIPTED intent; SENTENCE optionally AI-written with fixed fallback ("your mind's reached safety — that's the hard part done"). Component = moon line + reward bloom.
- **REWARD:** **Yes** — `recordLight`, warm and settling. Affirms she rode the break out.

---

## Step 3.7 — CBT flow (multiple choice)

- **ROLE:** Now that she can think, do light cognitive work — but only *after* the body is safe. Multiple choice, not open reflection, because she's still tender.
- **TONE:** Curious and collaborative, never Socratic-interrogating. Low effort to answer.
- **WHAT TO DO:** Run a short multiple-choice CBT sequence (direction: surface the thought, offer gentler readings of a *given* situation). The AI may warm a meaning she's already holding — it must not invent a new interpretation, diagnose, or prescribe a next step.
- **AI JOB + COMPONENT:** REFRAME (warm a given meaning) via multiple choice. Component = MC cards. **Fallback:** fully scripted MC branches if the model is off — the CBT content has scripted defaults so it runs model-free.
- **REWARD:** None here — the reward is gated on the arousal-check outcome (3.8).

---

## Step 3.8 — "Arousal dropped?" → branch

- **ROLE:** Honest check on whether regulation actually worked, and the fork between finishing and going again.
- **TONE:** Direct, caring, no pressure to say yes to please the moon.
- **WHAT TO DO:** Ask if the intensity's come down. **Yes** → reward + hand off to Act 2 (explore how she handles it). **No** → route to MORE REGULATION (3.9). Direction: make "no" fully okay — it's information, not failure.
- **AI JOB + COMPONENT:** SCRIPTED. Component = yes/no. Yes → reward bloom then Act 2 (06). No → 3.9.
- **REWARD:** **On "yes" only** — `recordLight`, affirming the work landed. No reward on "no" (rewarding an unresolved spike would gamify distress); instead, reassurance that we'll try another way.

---

## Step 3.9 — More regulation (switch strategy + escalate)

- **ROLE:** When one strategy didn't land, don't repeat it — switch and escalate up a fixed ladder until something moves the body.
- **TONE:** Unfazed, steady, still on her side. "Okay, that one didn't do it — we've got others." No hint that she failed.
- **WHAT TO DO:** Move to the next rung, **never repeating the same breath**: **cold** (cold water/face) → **move** (walk, shake it out) → **fix the body** (food/water/rest gap from 02) → **cap it** (contain/time-box the spiral) → **accept-protect-defer** (accept the feeling, protect her from the reactive action, defer the decision). Direction: pick the next un-tried rung, run it, then loop back to the arousal check (3.8).
- **AI JOB + COMPONENT:** SCRIPTED (ladder is fixed and ordered). Component = whichever rung's mini-flow (each has its own button/checklist/timer as needed). **Fallback:** none — ladder is fully scripted; guardrail "don't send it" persists throughout.
- **REWARD:** Only via the arousal check when it finally reads "yes" (3.8). No reward for merely trying another rung.
