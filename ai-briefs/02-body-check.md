# Phase 02 — Body check

Before routing her into a lane, rule out the cheap physical causes. Hungry, tired, and un-moved bodies manufacture emotion; catching that here can shrink the whole thing. Fast, light, one screen. Reached after the naming beat (01), before arousal lanes (03–05). See `_legend.md` for schema + invariants.

---

## Step 2.1 — Ask: hungry / tired / moved?

- **ROLE:** Check the three body states that most often masquerade as mood, so she doesn't do emotional work on a problem that's really low blood sugar or no sleep.
- **TONE:** Light, practical, a little knowing — "let's rule out the boring stuff first." Not clinical, not a health quiz. Never implies her feeling *is* "just" hunger (that's the "just hormones" guardrail's cousin — don't dismiss).
- **WHAT TO DO:** Three quick checks — has she eaten, slept, moved her body recently? Direction: frame as taking care of the basics, not as explaining her feeling away. Keep the copy tiny; this is a pit stop, not a station.
- **AI JOB + COMPONENT:** SCRIPTED (fixed question copy). Component = 3 checkboxes / toggles, yes-no each, one screen, quick submit. No model call needed.
- **REWARD:** None yet — reward lands at 2.3 after she's set the action.

---

## Step 2.2 — Any "no" → "can you eat / move soon?"

- **ROLE:** Turn a gap into a concrete, doable next thing — without derailing the emotional flow.
- **TONE:** Gently practical, low-pressure. An offer, not an instruction. If she can't right now, that's fine.
- **WHAT TO DO:** For each unmet basic, ask if she can address it soon (eat something, rest, get a short walk). Direction: one small ask per gap, phrased as "can you…soon?" — never a lecture on nutrition/sleep hygiene, never advice beyond the single doable step. If she says she can't, don't push; just carry it forward as an intention.
- **AI JOB + COMPONENT:** SCRIPTED (the ask is fixed per basic). Component = a soft confirm ("yeah / not right now") that, on yes, seeds a Today action (2.3). **Fallback:** none needed — no model in the loop.
- **REWARD:** None yet (paired with 2.3).

---

## Step 2.3 — Becomes a Today action + reward

- **ROLE:** Persist the care so it survives the flow — "eat something", "step outside" lands on her Today list — and reward her for tending the body.
- **TONE:** Warm, matter-of-fact. Honors that noticing and choosing to fix a basic *is* self-regulation.
- **WHAT TO DO:** Write the accepted basic(s) as a Today action (direction: name it as her choice, "you'll grab food soon"). Then the moon gives light. If all three were fine, skip silently to the arousal lane — no empty action, no forced reward.
- **AI JOB + COMPONENT:** SCRIPTED. Component = Today-action write + reward bloom. Routing continues to the arousal lane (03/04/05) set silently by her 1.2 feeling.
- **REWARD:** **Yes** — `recordLight`, small and warm, affirming she took care of a basic. Only fires if at least one action was set; no reward when nothing needed doing.
