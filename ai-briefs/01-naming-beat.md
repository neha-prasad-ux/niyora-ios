# Phase 01: Naming beat

The first time the moon really speaks. Its job is to make her feel caught: what she said landed, the feeling has a name, and the name is hers. Six beats, and the first two are conditional. See `_legend.md` for schema and invariants.

**Spec:** `moment-flow.yaml` → `naming:` (`clarify`, `acknowledge`, `together`, `naming_science`, `feelings`, `name_reward`, `feel_heard`, `reframe_small`). `intensity_in` fires before all of this, see `00-entry.md` step 0.6. If a step and its node disagree, **the node wins**.

**Both intensity paths come through here.** Big and small both get named. The small path short-circuits at 1.6, not before.

---

## Step 1.1: Clarify (conditional: thin input only)

- **SPEC:** `clarify`
- **ROLE:** If there's no concrete event to work with, get one before doing anything else. Reflecting "idk" back is the ELIZA parody and it makes the app sound stupid.
- **TONE:** Curious and easy, not an interrogation. She isn't being marked on her answer.
- **WHAT TO DO:** Fires **only** when the entry is thin or has no event ("idk", "everything", "just bad"). Ask for the specific thing: "what's the thing sitting heaviest right now?" / "tell me what actually happened." **Never invent an event to fill the gap.** This is a loop, not one shot, the question is whether the moon has enough concrete detail to reflect specifically. **Cap it at 2 tries, then proceed with what we have** so she can't go ten rounds on one question while upset.
- **AI JOB + COMPONENT:** REFLECT. Component = moon line + the text field again. **Her answer is free text, so it re-enters the crisis scan** (`00-entry.md` step 0.3). **Fallback:** one scripted ask, then proceed.
- **REWARD:** None.

---

## Step 1.2: Acknowledge (conditional: TIERED, does not always fire)

- **SPEC:** `acknowledge`, tiering per `NEXT.md` → "The acknowledge tiering"
- **ROLE:** Prove she was heard before asking her for anything, **when there's something to prove.** Acknowledge earns its place in proportion to how much she said.
- **TONE:** Warm, close, unhurried. A friend who was actually listening, leaning on her specifics, not summarising that "a hard thing happened".

| her input | what fires |
|---|---|
| thin, no event ("idk", "everything") | **clarify** (1.1), not acknowledge |
| short and clear ("he didn't call") | **SKIP acknowledge**, straight to `together`. She knows we read it, there was nothing to miss |
| rich and detailed (several facts) | **acknowledge**, reflecting it back proves we read it |

- **WHAT TO DO:** Say back the concrete thing she typed, in her words, ≤2 lines. Mirror the **event**, not the emotion, no fixing, no reframe, no advice, no feeling label yet, that's hers at 1.4. **Reflect the event and the body, never her read of another person's intent** (voice-bible rule 17): "he didn't call, and you've been checking your phone since" ✅, "he's clearly pulling away from you" ❌. Sycophancy risk is highest at exactly this beat.
- **AI JOB + COMPONENT:** REFLECT. Component = a single moon line. **Fallback:** a scripted neutral line that invents no specifics ("okay. that's a lot to be holding"). Never fabricate a detail she didn't say.
- **REWARD:** None yet, the light lands at 1.5.

---

## Step 1.3: "you're not in this alone"

- **SPEC:** `together`
- **ROLE:** Set the frame that the next few minutes are joint work, before asking her to do anything.
- **TONE:** Steady, no swelling music.
- **WHAT TO DO:** Fixed copy: **"you're not in this alone, let's handle this together."** Note what it does NOT say: nothing about being here later, nothing about the moon's own feelings. It is about this session, which is the line that keeps it inside voice-bible rule 14.
- **AI JOB + COMPONENT:** SCRIPTED, fixed. Component = moon line.
- **REWARD:** None.

---

## Step 1.4: Why we start with a name

- **SPEC:** `naming_science`
- **ROLE:** Tell her what the naming is for, so the skill transfers outside the app. **This beat is REQUIRED.** An earlier version of this brief forbade it, that was wrong.
- **TONE:** Plain. A fact she can use, not a lesson.
- **WHAT TO DO:** Fixed copy: **"putting words to a feeling actually settles it down a bit. that's the whole reason we start here."**

  Why it is phrased exactly that softly: the claim we hold is affect **labelling** (Lieberman 2007). The older line claimed that *precise* words beat *generic* ones, which is emotional granularity, textbook rather than a citation we hold, and it opened with "research says". Claim labelling only, and never appeal to authority. Do not restore the longer line.
- **AI JOB + COMPONENT:** **SCRIPTED, fixed, not an AI slot.** Do not let the model rewrite this "for freshness", the wording is the safety margin. Component = moon line above the chips.
- **REWARD:** None.

---

## Step 1.5: Offer 3 feelings, she confirms, first light

- **SPEC:** `feelings`, then `name_reward`
- **ROLE:** Hand her language without putting words in her mouth. Picking from three is far lower effort than generating a word cold, and confirming makes the name hers.
- **TONE:** Offering, not diagnosing. She is allowed to reject all three.
- **WHAT TO DO:** Surface the 3 candidates from extraction as chips, plus **more** and **add own**. Common words only, per the voice bible's feeling list, no "raw", "tender", "unmoored". One pick, then move, don't stack a second question. Her pick silently sets the arousal lane, no extra question is asked. Then the moon gives light.
- **AI JOB + COMPONENT:** CLASSIFY. Component = 3 chips + "more" + "add own" (text). **Fallback:** a scripted triad matched to the size read (BIG negative: "angry · overwhelmed · hurt") with the same escape.
- **WHY-LINE:** required and currently missing (`meta.why_lines` lists the 3 chips as MISSING). One sentence above the chips, what it does for her, not what it does in the brain. 1.4 is adjacent but it is not the same line, 1.4 says why we name at all, the why-line says what picking one of these three gets her.
- **REWARD:** **Yes** at `name_reward`. `recordLight`, a gentle bloom, not celebratory. Affirms the effort of naming, never the distress. This is the first time the moon blooms.

---

## Step 1.6: Feel-heard, then the small-emotion fork

- **SPEC:** `feel_heard`, then `reframe_small`
- **ROLE:** Hand the feeling back to her in her own language, then, for a small emotion only, try to resolve it here and let her go.
- **TONE:** The most tender beat in the phase. Slow, precise, close. This is the line she should feel in her chest.
- **WHAT TO DO:**
  1. **`feel_heard`:** reflect her confirmed feeling tied to her situation, in her words. It has to sound like it could only be about her. One line, maybe two. No pivot to fixing. Rule 17 still binds, tie the feeling to the **event**, not to a verdict about the other person.
  2. **`reframe_small`, SMALL emotions only:** one gentle reframe to resolve it quickly.
     - lands → straight to `we_good` (08). She's done, and the flow is allowed to be short.
     - doesn't land → `body_check` (02).
     - **BIG emotions skip the reframe entirely** and go to `body_check`. A flooded woman cannot reframe, that's the whole reason the lanes exist.
- **AI JOB + COMPONENT:** REFLECT for `feel_heard`, REFRAME (warm a *given* meaning, never invent a new one) for `reframe_small`. Component = a held moon line, then the fork. **Fallback:** if specifics can't be reflected safely, a scripted line using only the confirmed feeling word, never inventing the "because".
- **REWARD:** None. 1.5 already gave the light, and stacking a second here would cheapen both. This beat rewards emotionally, not with the moon's light.
