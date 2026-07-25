# Flow vs. the research bank — what the evidence says

Audit run 2026-07-25 against `research-cockpit/research.db` (3,109 papers),
prioritising `grade_auto='strong'`, RCTs and meta-analyses.
Full report: `scratchpad/finetune/flow-evidence-audit.md` (65KB).

**Neha's idea to check the flow against the research was the highest-value move
of the session.** It found a safety inversion nothing else would have caught.

---

## 0. The meta-finding: the bank can't answer most of our questions

The bank is a **PMS/menstrual + women-at-work** corpus. It does **not** contain
the emotion-regulation literature this flow is built on. Verified with word-
boundary regex (not just ILIKE) to rule out search failure:

| flow mechanism | papers in bank |
|---|---|
| affect labeling / emotional granularity | **0** |
| slow / extended-exhale breathing | **0** |
| circumplex valence-arousal model (**our entire 3-lane architecture**) | **0** |
| cold water / diving reflex / TIPP | **0** |
| distraction vs rumination, venting/catharsis | **0** |
| grounding techniques | **0** |

These mechanisms may well be supported by outside literature — but **we cannot
cite them from here.** "We have a 3,109-paper research bank" must never become
the justification for the breath count, the timer, or the naming line.

*(Methodological caution: an ILIKE search for cold-exposure returned 868 hits,
all false positives on `ice` inside "practice/service/device". Spot-check any
count from this bank before it reaches a slide.)*

---

## 1. 🔴 SAFETY: we watch the wrong days

Suicide deaths **+26%** and attempts **+17% at menstruation**, vs +13%
admissions premenstrually (2019, meta-analysis/SR, strong).

**Our Gate 1 raises attention during the luteal window and relaxes exactly as
risk peaks.** This is an inversion, not a gap. Menstruation currently gets no
special handling at all.

## 2. 🔴 SAFETY: crisis tier has no means restriction and no safety plan

Today it is a handoff and a full stop. Context: **39.1%** of prospectively-
confirmed PMDD report current suicidal ideation in the late luteal phase (2022,
RCT, strong); PMDD carries **OR 6.97** for attempt (2021, meta-analysis/SR,
strong). Both missing behaviours are **fully scriptable — zero model
involvement.**

## 3. 🔴 SAFETY: no unsafe-home branch, and MIXED argues against her read

**95%** sexual-abuse history among severe-PMS treatment-seekers (2000, strong,
60 cites); ~65% estimated PTSD.

Two concrete harms in the current flow:
- `mixed_deweight` tells her the read is "the sensitivity talking" — we may be
  talking a woman out of an accurate threat perception.
- `high_pick_activity` ships the verbatim **"don't text him / don't send
  anything for 20 minutes"** into a home we know nothing about.

## 4. 🔴 Dissociation routes to LOW → activation, and can't get out

Dissociation presents as flat/numb, so it lands in LOW — which explicitly
forbids the closest thing to the right response, and loops (`low_better: no ->
low_activate`) with no exit. **There is no grounding beat anywhere in the flow.**

## 5. 🟠 The 20-minute delay probably feeds rumination — and most sessions get
the risk without the mitigation

This population shows late-luteal rumination reliance (2025, meta-analysis/SR,
strong) and increased rumination after social rejection in low-estradiol (2026).
A delay likely feeds rumination **unless it is filled**.

Brief 03.5 has exactly the right instinct ("so she doesn't just sit and
ruminate") — but **only the 20-minute branch gets an activity.** The
no-time / 1–2 min / 5 min branches issue the hold and go straight to CBT with
nothing to do. Those are most sessions. **This is the most fixable
evidence-grounded flaw in the flow.**

---

## Claims we should stop making (as stated)

- **`naming_science`: "research says people who describe feelings with precise
  words rather than generic ones cope better."** Zero supporting papers in the
  bank. This is our most user-facing science claim and it is spoken as *"research
  says"*. Either find the citation (affect-labeling literature, outside this
  bank) or change the copy.
- **"hold until ~day 14."** The only support is 2026, **n=23**, observational —
  and it compares early- vs late-follicular, **never luteal vs late-follicular**,
  which is what we actually advise. Day 14 is a 28-day idealisation contradicted
  by the bank's own cycle-variability papers; ovulation-aligned HRV shows **no
  population-level rhythm** (2026). *The beat is good; the number isn't.*
  → replace with a **state-anchored** hold ("when you're steadier"), not a date.
- **"longer exhale = the fastest lever on the vagus nerve."** Zero breathing
  papers, and the bank's vagal evidence leans *contrary*: luteal vmHRV increases
  tracked *worse* premenstrual affect (2024, meta-analysis/SR, strong).
- **Exercise as an acute regulator.** The SMD −1.08 everyone quotes is an
  **8-week** effect, I²=87%, 87% high risk of bias. Not an in-the-moment claim.

## What genuinely holds up

- **The amplifier framing.** PME is literally "a pre-existing thing got
  amplified" — our copy and the science agree. Keep it.
- **Rejection sensitivity as causally hormone-linked** (2022 crossover RCT).
- **The body check** — and stronger than expected: one 2026 paper found
  day-to-day sleep/stress/fatigue moved the regulation biomarker while
  ovulation-aligned cycle phase showed **no population rhythm at all**.
  → **argument for prioritising the body check *over* the cycle framing.**
- ⚠️ but the body check is currently an **unscreened food prompt**; binge eating
  is elevated throughout the luteal phase (2022 review).

---

## Corpus implications (for the fine-tune already trained)

The scripted lines (`naming_science`, day-14 timing) are **not** model outputs,
so they are not baked into the weights — they're app copy and cheap to change.
But two AI slots are affected and would need regeneration if we change the
stance:
- `deweight` (124 examples) — the "it's a swing, de-weight it" move that the
  audit flags as potentially talking her out of a real threat.
- `activity_context` (342 examples) — may assert physiological claims
  (vagus/adrenaline) the bank doesn't support.

Slot-tagged corpus = surgical regeneration; we do not rebuild all 5,367.
