# Phase 07: Time it, and make it an if-then

She's got a concrete thing out of Act 2. This phase decides **when**, and turns it into the one form of plan with real evidence behind it. See `_legend.md` for schema and invariants.

**Spec:** `moment-flow.yaml` → `timing:` (`time_it`, `today_action`). If a step and its node disagree, **the node wins**.

**🔴 THE ~DAY-14 HOLD IS REMOVED.** The whole of the old version of this file was about it. Nothing in the flow may defer her for days or wait for a cycle window. Why it went:
- the day-14 number rested on a single n=23 observational study comparing early- to late-follicular, which never tests the luteal vs late-follicular contrast we were actually advising
- a **scheduled** worry window has evidence, **plain postponement fails clinically** (McGowan & Behar 2013). "hold it for a week" with nothing scheduled was precisely the version the literature says doesn't work

**What survives: the short delay.** The 20-minute break before acting is well supported, and regulating before reframing is the reason the lanes come first. **Delay to regulate, yes. Defer for days, no.** If she genuinely wants to wait, **schedule the return**, a concrete window she agrees to, never a vague later.

---

## Step 7.1: Now, or a scheduled return?

- **SPEC:** `time_it`
- **ROLE:** Land the act at a time she'll actually do it, with today as the default.
- **TONE:** Practical, on her side, not a coach. Short.
- **WHAT TO DO:** Two branches, both real:
  - **now** → the default. She's regulated, the thing is small, today is the point.
  - **scheduled return** → a concrete agreed window. **Never a vague later**, and never a cycle-anchored one.

  **TIRED-AWARE.** If `tired: true` was set at the body check (02 step 2.3), **this is where the now-or-tomorrow question gets asked**, because by now there is a specific thing to time (the message she just drafted, the script she just wrote), so the question is answerable. Copy:
  > "you're tired, and this is worth doing. now, or tomorrow?"

  **"do it now anyway" must read as a real, un-shamed option.** If she's tired and it's late the copy may lean toward holding, but the choice is never removed. Tomorrow still schedules a concrete window.
- **AI JOB + COMPONENT:** SCRIPTED, deterministic. Component = two-way + a window picker on the scheduled branch. **Fallback:** none needed.
- **WHY-LINE:** drafted in the spec, ship it as written: **"tired talking comes out sharper than you mean it. that's the only reason to wait."** Note what it does: gives the one plain reason and stops. It doesn't claim a mechanism, and it doesn't dress exhaustion up as science, because it isn't.
- **CYCLE FRAMING:** the phase gate (00 step 0.4) still binds. On a normal day, nothing here may attribute the timing to her cycle. With the day-14 hold gone there is no cycle-anchored option left anyway, so in practice this gate now only guards against a new one creeping back in.
- **REWARD:** None yet.

---

## Step 7.2: The if-then

- **SPEC:** `today_action`
- **ROLE:** Turn the act into an **if-then**, not a to-do. This is **the single biggest documented lever in the whole flow** and it used to be reduced to a today-or-wait chip.
- **TONE:** Concrete and quick. Two blanks, not an exercise.
- **WHAT TO DO:** Two fill slots, stored as **"IF \<specific trigger\>, THEN \<what i say or do\>"**:
  - "if he brings it up at dinner, then i say ___"
  - "if she replies defensively, then i stop and pick it up tomorrow"

  **SHE fills both slots, not the model.** Written only after she's calm.

  **The number: d = 0.53** (implementation intentions vs goal intentions, the fair comparator). **Do not write 0.91**, that's the figure against no-instruction controls and it overstates what we're adding. If an older doc says 0.91 or 0.65, the older doc is stale.

  **The after-the-fight checklist**, attached **only** where the act she chose has an "after": say-it-to-them, own-my-part, a-real-hurt, work-clash. Nobody needs an after-checklist for "have a shower". Content: reconnect, look after yourself, what to watch for. It pairs with the 24h follow-up, the checklist says what to expect and the follow-up asks how it went.
- **AI JOB + COMPONENT:** SCRIPTED scaffold, her text in the slots. **Her text re-enters the crisis scan.** Component = two fill fields + optional checklist + reward bloom. **Fallback:** none, the model isn't writing the plan.
- **WHY-LINE:** required and currently missing, and `meta.why_lines` singles it out: the largest documented effect in the flow is currently presented as a fill-in-the-blank with no stated purpose. This is the second model-written why-line, because it has to name her actual trigger. What it does for her: deciding the exact moment now means she doesn't have to decide it while it's happening.
- **REWARD:** **Yes.** `recordLight`, warm, affirming she turned a feeling into a plan she can actually run. Then → we good? (08).
