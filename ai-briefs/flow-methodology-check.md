# Is the flow the right methodology? — cross-check against the real evidence base

Neha supplied the actual citations behind the Mural flow (2026-07-25). This is
the validation that matters; my earlier audit checked `research.db`, which is a
PMS/women-at-work bank and simply does not contain the regulation literature.
**Correction to that audit: "0 papers" was a fact about the bank, not a verdict
on the flow.**

Verdict up front: **the spine is right, and three specific beats are wrong** —
each one wrong in a way Neha's own citations diagnose.

---

## ✅ VALIDATED — the architecture is well-chosen

| flow decision | evidence | verdict |
|---|---|---|
| intensity gate; regulate BEFORE reframe; small-vs-big split | Sheppes 2011 — at high intensity distraction beats reappraisal, at low intensity reappraisal works | **correct, and non-obvious**. Putting CBT *after* the break (not before) is exactly right |
| no-vent; break filled with distraction | Bushman 2002 + 2024 anger meta (154 studies) | **correct.** Venting rehearses anger |
| the naming beat | Lieberman 2007 — affect labeling lowers amygdala activity | **correct** |
| 20-minute break, "don't act now" | Gottman flooding / DPA | **correct** |
| 4:6 breathing | slow-breathing/HRV meta 2022 — ~6 breaths/min raises vagal tone | **correct: 4+6 = 10s = exactly 6/min.** The *pace* is the evidence-backed part |
| LOW lane = activation, not calming | behavioural activation for anhedonia RCT | **correct** |
| counter-the-critic (shame) | self-compassion meta + Ferrari 2019 | **correct — and one of the few with self-guided evidence** |

---

## 🔴 GAP 1 — no controllability routing (the biggest methodology miss)

Specker/Sheppes 2024 + Bonanno regulatory flexibility: **match strategy to
context — reappraisal helps when the situation is uncontrollable and *hurts*
when it is controllable.**

Our flow routes **only by arousal** (high / low / mixed). There is no
controllability check anywhere. So a woman with a *fixable* problem gets the same
reappraisal-shaped path as one with an unfixable one — and for her, the evidence
says reappraisal actively hurts.

**Fix:** add a controllability fork after regulation, before Act 2.
Uncontrollable → feel/accept/anchor. Controllable → act/plan/draft.
This is a genuine architectural addition, not a copy tweak.

## 🔴 GAP 2 — "let it wait" is plain postponement, which fails

McGowan & Behar 2013: a **scheduled worry-window has evidence; plain
postponement fails clinically.**

Our `time_it` beat offers "today" or "let it wait / hold until ~day 14" — and
then nothing. No scheduled return, no window. That is precisely the version the
literature says does not work. (It also compounds the separately-documented
problem that the day-14 number itself rests on one n=23 study.)

**Fix:** every "wait" must schedule its return — a concrete window she agrees to,
not a vague later. Turn the hold into a worry-window, not a deferral.

## 🔴 GAP 3 — the single biggest lever is under-implemented

Webb/Gollwitzer 2012: implementation intentions regulate affect at **d = 0.91** —
by Neha's own note, *"the single biggest lever."*

Ours is a today/wait chip pair. That is a *timing* choice, not an if-then plan.
We are getting a fraction of the available effect from the strongest tool we have.

**Fix:** make the Today action an explicit **"if [trigger], then [action]"**
("if he brings it up at dinner, then I say X"). Cheap change, largest documented
payoff in the whole flow.

## 🟠 GAP 4 — the unfilled hold (now double-confirmed)

Gottman: heart rate resets in ~20 min **only with active distraction**.
Bushman: unfilled delay = rumination = rehearsal.

Only the **20-minute** branch gets an activity. The **no-time / 1–2 min / 5 min**
branches issue the hold and go straight to CBT with nothing to do. Those are most
sessions — getting the risk without the mitigation. An unfilled hold is not
neutral; it is rumination time.

**Fix:** every branch gets a filler scaled to its length. No bare holds.

---

## ⚠️ Copy that overclaims relative to its own citation

- **`naming_science`**: we say *"people who describe feelings with **precise
  words rather than generic ones** cope better."* Lieberman 2007 supports
  *labeling*; the precise-vs-generic claim is **emotional granularity (Barrett)**,
  which Neha flags as textbook, not a pulled citation. Either soften to labeling
  ("putting words to it settles the alarm") or cite granularity properly.
- **breathing rationale**: the ~6/min *pace* is solid; "longer exhale = the
  fastest lever on the vagus nerve" is the mixed part (Neha's own note). Keep the
  count, drop the mechanism claim.
- **crying**: Gračanin 2014 — crying self-soothes **only** when it leads to
  comfort/reappraisal, and often worsens mood as rumination-crying. My generated
  PMS scenario says *"if the crying keeps coming, let it, that moves the feeling
  through"* — that **prescribes** crying as beneficial. Evidence says permit and
  personalise, never prescribe. **Corpus implication:** any generated line that
  frames crying as inherently releasing should be regenerated.

---

## The real validity risk (Neha's own flag, and she is right)

**Almost all of this evidence is therapist-delivered; our app is self-guided on a
phone.** The directions are well-grounded; *"it works unguided"* is the untested
leap. Known self-guided evidence: self-compassion (Ferrari 2019, holds), DBT
skills app (mixed on distress tolerance), internet CBT for PMS (guided, not
self-guided).

EFT attachment-injury work is **therapist-only** — our honest-talk beat borrows
the *frame* and must never imply it delivers the therapy.

**Recommendation:** tag the corpus and any future harvest `self-guided vs
guided`, and never let a therapist-delivered result become a hard in-app claim.

---

## Priority order

1. Controllability routing (architecture) — GAP 1
2. If-then implementation intentions (biggest documented effect) — GAP 3
3. Fill every hold branch (safety-adjacent: unfilled = rumination) — GAP 4
4. Schedule the worry-window instead of deferring — GAP 2
5. Fix the three overclaiming copy lines
