# Phase 05: Mixed / labile lane (all over the place, rejection-sensitive)

Routed here **silently** from the feeling she picked at 1.5. Her emotions are swinging fast, often rejection-sensitivity firing. The job is not to calm or activate. It's to help her not trust the peaks, sort a swing from a real signal, and leave with an anchor. The core move is a careful reflection of the specific thought she's spinning on. See `_legend.md` for schema and invariants.

**Spec:** `moment-flow.yaml` → `lanes:` MIXED (`mixed_name_swing`, `mixed_validate`, `mixed_check_read`, `mixed_swing_real`, `mixed_real`, `mixed_anchor`). If a step and its node disagree, **the node wins**.

**`deweight` is REMOVED.** It used to sit on the swing branch and it is gone from the flow, from the slot list, and from the corpus. See 5.4.

---

## Step 5.1: "name the swing, trust no peak"

- **SPEC:** `mixed_name_swing`
- **ROLE:** Give her a frame for what's happening. Naming it as a swing already loosens its grip.
- **TONE:** Steady, orienting. Warm but firm, the fixed point while she's moving.
- **WHAT TO DO:** Fixed copy: **"name the swing, trust no peak."** Name that the intensity is swinging and that the high points aren't reliable readings. **Do not dismiss the feeling itself**, only its reliability at the extremes. Those are different claims and the difference is the whole safety margin of this lane.
- **AI JOB + COMPONENT:** SCRIPTED, fixed. Component = moon line.
- **REWARD:** None.

---

## Step 5.2: Ride it, and validate it

- **SPEC:** `mixed_validate`
- **ROLE:** Let the wave move through without her acting on it, while the feeling itself is treated as real.
- **TONE:** Companioning. Riding it with her, not instructing from outside.
- **WHAT TO DO:** Invite her to let it rise and fall without acting. Separate the two things explicitly: **the feeling is real, the story at the peak isn't necessarily true.** No fixing, no reframe yet, the sort comes at 5.4.
- **AI JOB + COMPONENT:** SCRIPTED, with a fallback line that uses no specifics ("you're allowed to feel all of this, you just don't have to move on it yet"). Component = moon line, optionally a brief settling visual. **No timer, no breath**, this is not the high lane.
- **REWARD:** None.

---

## Step 5.3: Check the read

- **SPEC:** `mixed_check_read`
- **ROLE:** The pivot of this lane. Surface the exact thought she's holding so it can be looked at instead of obeyed.
- **TONE:** Gentle, precise, non-judgmental. Holding the thought up to the light with her, not correcting her.
- **WHAT TO DO:** Reflect her specific rejection-thought back, in her words. Attribute the read **to her**, never state it as fact. That distinction is voice-bible rule 17 and it is the single highest-risk line in the flow, because sycophancy peaks exactly at the reflection beat.
  - ✅ "the read right now is that he's pulling away."
  - ❌ "he's clearly pulling away from you."

  Don't generalise it, don't add reassurance yet, don't argue with it. This sets up the fork.
- **AI JOB + COMPONENT:** REFLECT. Component = moon line + the swing/real control. **Fallback:** a scripted general form that names no person and no detail she didn't give.
- **REWARD:** None.

---

## Step 5.4: Swing or real? She sorts it

- **SPEC:** `mixed_swing_real` → `mixed_anchor` / `mixed_real`
- **ROLE:** Let her sort the thought. **We do not argue either way.**
- **TONE:** Collaborative and respectful of her read. She is the authority on which it is.
- **WHAT TO DO:** Fixed copy: **"swing or real?"** Two paths:
  - **swing** → straight to the anchor (5.5). Nothing else. **Do NOT tell her this is the sensitivity talking.**
  - **real** → `mixed_real`: honour it as a real signal, don't dismiss it, and route toward the matching act at the options menu (06). Then the anchor.

  **🔴 `deweight` was REMOVED 2026-07-25 and must not come back.** It told her the read was "the sensitivity talking", which is (a) telling a woman not to trust her own perception, (b) unsupported by anything we hold, (c) the never-just-hormones rule broken in a different costume, and (d) capable of talking her out of an **accurate** threat read. There are ~124 examples of the dead slot in the corpus and Stream D2 is dropping them. If you find yourself writing a softer version of it, that is still it.

  The swing branch is therefore quieter than it used to be, and that is correct. She named it as a swing herself, which is the work. We don't need to add a verdict on top.
- **AI JOB + COMPONENT:** She makes the call via the control, the model does not pre-pick. REFLECT on the real branch only. Component = two-way, presented with no lean. **Fallback:** the same neutral two-way. Guardrail: never auto-label a real hurt as a swing.
- **WHY-LINE:** required and currently missing.
- **REWARD:** None here, it comes at 5.5.

---

## Step 5.5: Anchor

- **SPEC:** `mixed_anchor` → `ready_reward`
- **ROLE:** Leave her on something stable, a fixed point that outlasts the swing.
- **TONE:** Settling, warm, quietly certain. The ground under the wave.
- **WHAT TO DO:** One steadying line she can hold while it passes. It must be **true and small**. Don't predict the future, don't claim a history she didn't tell us ("this always passes" is a fact about her life that we do not have). One or two lines, then the ready reward, then the options menu (06).
- **AI JOB + COMPONENT:** REFRAME, warm the given situation into a steadier read, never a new interpretation. Component = moon line + reward bloom. **Fallback:** a scripted anchor that makes no promise about how it turns out.
- **REWARD:** **Yes**, at `ready_reward`. `recordLight`, calm and steadying. Affirms she rode a swing without acting on the peak, which is the skill this lane teaches.
