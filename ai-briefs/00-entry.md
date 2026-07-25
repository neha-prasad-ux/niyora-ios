# Phase 00: Entry

She arrives carrying something and types it raw. This phase reads what she wrote, checks she's safe, takes her own intensity number, and sizes the walk-down. The moon barely speaks here, it's mostly listening and routing. See `_legend.md` for the field schema and invariants.

**Spec:** `moment-flow.yaml` → `entry:` (`raw_entry`, `crisis_scan`, `safe_check`, `crisis_handoff`, `intensity_split`) and `naming:` → `intensity_in`. Every step below names the node it implements. If a step and its node disagree, **the node wins**.

---

## Step 0.0: The first message (before the first session only)

- **SPEC:** no node. Approved copy lives in `NEXT.md` → "The first message". Do not re-type it here, a second copy is how these files went stale.
- **ROLE:** Say what this is, what it is not, and where the exit is, once, before she ever types.
- **TONE:** Plain and unembarrassed. Not a disclaimer wall, not a warm-up.
- **WHAT TO DO:** Ship the approved copy verbatim. Shown once, not every session. Three things in it are load-bearing and cannot be trimmed: **"i'm an ai"** (legal, California SB 243 and EU AI Act Art. 50(1)), the crisis line, and the plain statement that what she writes goes when she closes it. **No efficacy claim, ever** (an outcome claim about PMS reclassifies Niyora as a medical device).
- **AI JOB + COMPONENT:** SCRIPTED-VERBATIM. Component = a card before the text field. Crisis numbers render as **plain text, never tap-to-dial**.
- **REWARD:** None.

---

## Step 0.1: Raw entry (the text field)

- **SPEC:** `raw_entry`
- **ROLE:** Give her one clean place to dump the thing, with zero friction and zero pre-judgment. This is the mouth of the whole flow.
- **TONE:** Silent and open. The moon isn't talking yet, the screen just feels safe to type into. No prompt that steers her toward a "right" kind of answer.
- **WHAT TO DO:** Open text field, soft non-leading invite ("what's going on?" energy, not "describe your emotion", not "rate your mood"). No character minimum, no forced structure. She can be messy, swear, ramble. Nothing else on screen competing for attention.
- **AI JOB + COMPONENT:** SCRIPTED (the invite is fixed copy). Component = single multiline field, autofocus, keyboard up, one quiet submit. No model runs while she types, it only reads after submit.
- **REWARD:** None. Rewarding the act of typing would gamify distress.

---

## Step 0.2: Extraction (issue + candidate feelings + lane)

- **SPEC:** folded into `crisis_scan.detail` ("pull issue + candidate feelings + intensity")
- **ROLE:** Turn her raw text into what the rest of the flow routes on: the **issue** (what happened), **candidate feelings** (from the taxonomy), and a **size read**. Invisible to her.
- **TONE:** N/A, nothing is shown. No "analyzing…" theater, no spinner that implies she's being scored.
- **WHAT TO DO:** Parse silently. Hold a short issue summary, 3 ranked candidate feelings, and a big/small read. Surface none of it, she names her own feeling at `feelings` and the model never announces its guess. The picked feeling, not the extracted one, sets the arousal lane.
- **AI JOB + COMPONENT:** CLASSIFY. No component. **Fallback:** if the model is unavailable or low confidence, fall back to a scripted safe triad at `feelings` and treat the size as BIG (over-serving regulation is safe, under-serving it isn't). Never block the flow on extraction.
- **REWARD:** None.

---

## Step 0.3: Tiered crisis scan

- **SPEC:** `crisis_scan`, `safe_check`, `crisis_handoff`
- **ROLE:** Catch genuine risk before anything else happens. A safety gate, not a feature.
- **TONE:** Calm, plain, unhurried. No alarm, no drama, no clinical distance. If it speaks, it speaks like someone steady who isn't scared of the sentence.
- **WHAT TO DO:** Three tiers, matched to what the text actually shows.
  - **Venting hyperbole** ("i could kill him", "i want to die of embarrassment") → treat as nothing, do not interrupt the flow.
  - **Ambiguous hopelessness** (vague "what's the point", no plan) → one soft check, VERBATIM: **"are you safe right now?"** Safe → resume. Not safe → hard tier.
  - **Explicit intent, plan, or means** → **hard handoff, scripted and verbatim.** The flow STOPS. The model does not compose, soften, or improvise here.

  Four rules that are not optional:
  1. **It runs on EVERY free-text message, not just this one.** Every node that accepts typing re-enters this scan: `clarify`, `we_good_more`, the Act 2 modules, the if-then slots. A gate she passes once is not a safety system (Wysa: 82% of crisis instances were surfaced by detection, only 18% by the user saying so).
  2. **Always on, every cycle phase.** Never gated or relaxed by cycle phase. Suicide deaths run +26% and attempts +17% at menstruation, so a luteal-weighted design would have relaxed exactly as risk peaks. Menstruation is not a safe window.
  3. **Round UP when uncertain.** An unnecessary "are you safe right now?" is cheap. A missed one is not.
  4. **The model is never the arbiter.** Whichever on-device model is running (currently targeting Gemma 4 E2B, do not write a model size into this rule again), it may flag, it may never decide.
- **AI JOB + COMPONENT:** CLASSIFY the tier, then SCRIPTED-VERBATIM for every line shown. **Fallback:** uncertain between tiers → serve the softer check. Model fully unavailable → a scripted keyword backstop still fires the soft check, so safety never depends on the model being on. Component = full-screen scripted card for the hard tier, inline soft line for the ambiguous tier. Resources render as **plain text, never `tel:`**, a tap leaves a carrier billing record on a device someone else may control.
- **WHY-LINE:** **none, deliberately.** `meta.why_lines` forbids one on the safety beats. An explanation here reads as persuasion, and we are not persuading her about her own safety.
- **REWARD:** None. Never light up around distress.

---

## Step 0.4: Cycle-framing gate (PMS vs normal day)

- **SPEC:** ⚠️ **NO NODE.** The spec has no phase gate, but voice-bible rule 10 and the timing beat both depend on one. Treated here as live behaviour and flagged for reconciliation, do not build a second version of it.
- **ROLE:** Decide whether cycle-framing is *allowed* downstream. A safety rule, not a flavour choice: on a normal day nothing in the flow may blame her cycle for how she feels.
- **TONE:** N/A, silent gate.
- **WHAT TO DO:** Read cycle data. Luteal window → framing ON (later beats may offer phase as context, never as dismissal). Normal day or no signal → framing OFF, no cycle-blame, never invent a phase. Set one flag the downstream beats read.
- **AI JOB + COMPONENT:** SCRIPTED, deterministic from cycle data, not a model decision. **Fallback:** missing or uncertain data defaults to OFF. The "never just hormones" rule applies in both states, framing ON still never means dismissal.
- **REWARD:** None.

---

## Step 0.5: Intensity split (big vs small)

- **SPEC:** `intensity_split`
- **ROLE:** Right-size the flow. A big emotion earns the full walk-down, a small one shouldn't be dragged through machinery it doesn't need.
- **TONE:** Matches the size. Big is steady and containing, small is light, a touch of "we don't need to make this a thing."
- **WHAT TO DO:** Branch on the size read from 0.2. **Both branches go to the naming beat.** The small path is not a shortcut past naming, it short-circuits later, at `reframe_small`:
  - **BIG** → naming beat (01), then body check and the lanes.
  - **SMALL** → the same naming beat, then one gentle reframe. If it lands, straight to `we_good`. If it doesn't, on to the body check like anything else.

  Do not route small emotions into Act 2 directly. That was the old shape and it skipped the beat that does the work.
- **AI JOB + COMPONENT:** SCRIPTED routing. **Fallback:** ambiguous → route BIG.
- **REWARD:** None here, the first light lands at `name_reward`.

---

## Step 0.6: Intensity in (0 to 10, her own number)

- **SPEC:** `intensity_in` (filed under `naming:` in the spec, but it fires here)
- **ROLE:** Take the baseline. This number and the one at the close are the measure, and the DELTA is the measure, not either number alone.
- **TONE:** Neutral. This is the one deliberately cool beat in the flow.
- **WHAT TO DO:** **"how big does it feel right now?"** 0 to 10, one tap. Fires immediately after she types and **BEFORE acknowledge**, because acknowledge is one of the things we're measuring and can't sit inside the baseline. The cost is a slightly cool first beat, accepted on purpose. **Never blocks:** if she skips it the flow continues and the record stores null.
- **PHRASING IS NOT COSMETIC:** ask how BIG it is, never "how much better do you feel?". The second presupposes improvement and will inflate the result.
- **AI JOB + COMPONENT:** SCRIPTED. Component = 0 to 10 tap row, skippable.
- **WHY-LINE:** required and currently missing (`meta.why_lines`: "she is being measured, say so"). One sentence above the scale, what it's for her: she gets to see whether this actually shifted anything, instead of guessing.
- **REWARD:** None.
