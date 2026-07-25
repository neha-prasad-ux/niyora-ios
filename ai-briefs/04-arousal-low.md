# Phase 04: Low-arousal lane (flat / numb / drained)

Routed here **silently** from the feeling she picked at 1.5. She is under-aroused, not flooded, so the whole logic inverts: **no breathing, no break, no calming.** That would sink her further. This lane is gentle activation, one tiny sensory input to lift her a notch. The bar is deliberately on the floor, doing one thing is a win. See `_legend.md` for schema and invariants.

**Spec:** `moment-flow.yaml` → `lanes:` LOW (`low_activate`, `low_justone`, `low_reward`, `low_better`). If a step and its node disagree, **the node wins**.

---

## Step 4.1: One small thing

- **SPEC:** `low_activate`
- **ROLE:** Give her one small, sensory, low-effort thing that nudges the body upward. Not a to-do list, not a mood project.
- **TONE:** The softest in the whole flow. Slow, unhurried, zero pressure. When someone is flat, brightness reads as a demand, so the moon stays quiet and warm and never peppy.
- **WHAT TO DO:** Fixed copy: **"just one small thing to lift you a notch."** Buttons: **sunlight · a song you love · a warm drink · pet the dog.** Each is one sensory hit, seconds to start, framed as an invitation rather than homework.

  **Explicitly do not** run breathing or a timed hold here. That is the high lane, and it is the wrong direction for her.
- **AI JOB + COMPONENT:** SCRIPTED, fixed option set. Component = buttons, one tap picks one. No model. **Fallback:** none needed.
- **WHY-LINE:** required and currently missing. `meta.why_lines` marks the *high* lane's activity pick as covered by `high_activity_context`, but the low lane's pick has no equivalent and no inventory entry. One sentence: what one small thing buys her is a slightly less flat next hour, not a fixed mood.
- **⚠️ SPEC FLAG:** "pet the dog" is a fixed button offered to everyone. It doesn't break the invent-nothing rule (it's a menu, not a claim about her life), but offering a dog to a woman without one is the small version of the same problem. Worth a pass on whether these four are the right fixed four.
- **REWARD:** None yet.

---

## Step 4.2: "just the one, done is enough"

- **SPEC:** `low_justone`
- **ROLE:** Pre-empt the flat-state trap where more than one step feels impossible and she does nothing. Lower the bar out loud so a single action feels complete.
- **TONE:** Permission-giving. She doesn't have to do it all.
- **WHAT TO DO:** Fixed copy: **"just the one, done is enough."** One line. No stacking, no "and then you could also".
- **AI JOB + COMPONENT:** SCRIPTED, fixed. Component = moon line with the buttons.
- **REWARD:** None yet.

---

## Step 4.3: She does one, then light

- **SPEC:** `low_reward`
- **ROLE:** Honour the activation. From a flat state, choosing to do one small thing **is** the regulation, so reward it fully.
- **TONE:** Warm, low, genuinely pleased for her without being loud. Lift her energy by a notch, don't overshoot it.
- **WHAT TO DO:** Give light and name that she moved at all. Don't ask for a second thing.
- **AI JOB + COMPONENT:** SCRIPTED. Component = reward bloom + one moon line.
- **REWARD:** **Yes.** `recordLight`, gentle and warm.

---

## Step 4.4: "feeling better?"

- **SPEC:** `low_better`
- **ROLE:** Light check on whether the nudge lifted her, and the fork onward.
- **TONE:** Soft, no pressure to perform improvement.
- **WHAT TO DO:** Ask if she's feeling a bit better. Keep the ceiling low, even "a tiny bit" counts.
  - **yes** → `ready_reward` → the options menu (06). **Not** a direct jump to a module, and **not** an early close. Every path converges on the same ending.
  - **not really** → back to 4.1 with a **different** option. Still no breathing, still no hold.

  This is a routing question, not the measurement. The 0 to 10 comes at the close.
- **AI JOB + COMPONENT:** SCRIPTED. Component = yes/no-ish picker.
- **⚠️ SPEC FLAG:** `low_better` loops to `low_activate` with no cap, same unbounded-loop issue as `high_ladder`.
- **REWARD:** None here, 4.3 already gave the light. Don't double-reward the check.
