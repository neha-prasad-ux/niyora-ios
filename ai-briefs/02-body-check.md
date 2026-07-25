# Phase 02: Body check

Before routing her into a lane, rule out the cheap physical causes. Hungry, tired and un-moved bodies manufacture emotion, and catching that here can shrink the whole thing. Fast, light, one screen. Reached from `reframe_small` (01), leads to the arousal lanes (03 to 05). See `_legend.md` for schema and invariants.

**Spec:** `moment-flow.yaml` → `body:` (`body_check`, `body_ask_soon`, `body_do_now`, `body_tired`, `body_today_action`, `body_reward`, `make_safe`). If a step and its node disagree, **the node wins**.

---

## Step 2.1: Ask: eaten / slept / moved?

- **SPEC:** `body_check`
- **ROLE:** Check the three states that most often masquerade as mood, so she doesn't do emotional work on a problem that is really low blood sugar.
- **TONE:** Light, practical, a little knowing. "let's rule out the boring stuff first." Not clinical, not a health quiz. Never implies her feeling *is* "just" hunger, that's the cousin of the never-just-hormones rule.
- **WHAT TO DO:** Fixed copy: **"quick gut check before we go on. have you eaten, slept, and moved lately?"** Three checkboxes. Keep it tiny, this is a pit stop, not a station.
  - any no → 2.2 (or 2.3 if the gap is sleep)
  - all yes → skip straight to 2.5, no empty action, no forced reward
- **AI JOB + COMPONENT:** SCRIPTED. Component = 3 checkboxes, one screen, quick submit. No model call.
- **WHY-LINE:** required and currently missing. One sentence above the boxes: what this gets her is a smaller problem, not an explanation of her feeling.
- **REWARD:** None yet.

---

## Step 2.2: "can you eat something NOW?"

- **SPEC:** `body_ask_soon` → `body_do_now` / `body_today_action`
- **ROLE:** Get the gap closed **now** if it can be. This is the one intervention in the whole flow that works immediately.
- **TONE:** Gently practical, low pressure. An offer, not an instruction. If she can't, that's genuinely fine.
- **WHAT TO DO:** Ask whether she can do it **right now**, matched to the gap: "can you eat something now?" / "can you get some water now?" / "can you step outside now?" Then branch:
  - **yes** → tell her to go do it. Warm, brief, no lecture, no nutrition talk. **The flow waits for her** and picks up when she's back.
  - **not now** → *then* it becomes a Today action (2.4).

  **This is not a note-to-self beat.** The earlier version only ever wrote a Today action, which deferred the one thing that helps within minutes. Do not restore that shape.
- **AI JOB + COMPONENT:** SCRIPTED, the ask is fixed per gap. Component = a two-way ("yeah" / "not right now"), and on yes a hold state the flow can resume from.
- **WHY-LINE:** required and currently missing. One sentence: what eating now buys her is a smaller feeling to work with, not a fixed situation.
- **REWARD:** None yet, it lands at 2.4.

---

## Step 2.3: Tired: name the cost, keep the choice

- **SPEC:** `body_tired`
- **ROLE:** Tiredness gets its own move, because you can't nap on demand. It doesn't add a task, it flags that the timing decision later needs to account for it.
- **TONE:** Level and honest. Telling her something true about herself, not managing her.
- **WHAT TO DO:** Two jobs, and only two:
  1. Name the cost: **"you're tired. that usually makes it come out sharper than you mean."**
  2. Record `tired: true`.

  Then straight on to 2.5. **This beat does NOT ask now-or-tomorrow.** It used to, and that was the bug: at the body check she hasn't been regulated, hasn't seen the options, and hasn't chosen an act, so "now or tomorrow?" was asking her to time an action that did not exist yet. Unanswerable. **The timing question lives at `time_it` (07), and the copy for it lives there too**, deliberately not repeated here so nobody re-implements it in this node.

  **Do not decide for her and do not tell her to wait.** And be honest about what this is: exhaustion as a reason to wait is **sensible, not evidenced**. Say it plainly, never dress it as science.

  Tiredness happens at 2pm as well as 2am. This is not a night-only branch.
- **AI JOB + COMPONENT:** SCRIPTED, fixed. Component = moon line. Sets a flag, no input required.
- **REWARD:** None. There is nothing for her to have done here.

---

## Step 2.4: Can't right now: Today action + light

- **SPEC:** `body_today_action` → `body_reward`
- **ROLE:** Keep the care from being lost when she genuinely can't act now.
- **TONE:** Warm, matter of fact. Noticing a basic and choosing to fix it later is still self-regulation.
- **WHAT TO DO:** Write the gap as a Today action, named as her choice ("you'll grab food when you can"). Then the moon gives light.
- **AI JOB + COMPONENT:** SCRIPTED. Component = Today-action write + reward bloom.
- **REWARD:** **Yes.** `recordLight`, small and warm. Fires only if an action was actually set, never when nothing needed doing.

---

## Step 2.5: "let's make you feel safe"

- **SPEC:** `make_safe`
- **ROLE:** The hinge into the lanes. Names that the next thing is getting her steady, not solving anything.
- **TONE:** Steady, low and slow. Fewer words, more floor.
- **WHAT TO DO:** Fixed copy: **"let's make you feel safe."** Then `lane_split` routes silently on the feeling she picked at 1.5. She is never asked which lane she's in.
- **AI JOB + COMPONENT:** SCRIPTED, fixed. Component = moon line + the transition into the lane.
- **⚠️ SPEC FLAG:** this line sits **before** the lane split, so the flat and numb woman gets it too, and it fits her badly. The low lane is explicitly not about calming. Raised for Neha, not resolved here.
- **REWARD:** None, regulation hasn't happened yet.
