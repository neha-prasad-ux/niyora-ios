# Phase 08: We good?

The close. One honest check, the second intensity number, a conditional nudge toward a person, and an ending. **The ending is a safety feature.** See `_legend.md` for schema and invariants.

**Spec:** `moment-flow.yaml` → `close_phase:` (`we_good`, `we_good_more`, `human_nudge`, `close`) and `naming:` → `intensity_out`. If a step and its node disagree, **the node wins**.

Order: **we good? → intensity out → human nudge (usually skipped) → close.** Both endings converge here, the one where she picked an act and the one where nothing felt possible.

---

## Step 8.1: "we good?"

- **SPEC:** `we_good`
- **ROLE:** Give her a genuine off-ramp and a genuine "no, i need more". The flow does not assume it worked.
- **TONE:** Warm, unhurried, no pressure to say yes. She isn't being wrapped up and shooed out.
- **WHAT TO DO:** Fixed copy: **"we good?"** Make "not really" exactly as easy to pick as "yeah". Don't pre-celebrate.
  - **yes** → 8.2
  - **no** → 8.4
- **AI JOB + COMPONENT:** SCRIPTED. Component = moon line + two-way.
- **WHY-LINE:** required and currently missing.
- **REWARD:** None here.

---

## Step 8.2: "and now?" (intensity out)

- **SPEC:** `intensity_out`
- **ROLE:** The second half of the measurement. **The delta between this and the number she gave at entry is the measure**, neither number means much alone.
- **TONE:** Neutral, quick, no build-up.
- **WHAT TO DO:** Fixed copy: **"and now?"** Same 0 to 10 scale as entry, same neutral wording, **no reference to improvement.**

  **This is not the mid-flow "any better?"** That one is a routing question asked while she's still working. This one is measurement, asked when the work is done. Two taps in the flow, not three.

  **Phrasing is not cosmetic:** never "how much better do you feel?". It presupposes improvement and will inflate the number. And treat the whole self-report cautiously, people reported feeling better after talking an upset through while showing no recovery at 3 days, 7 days or 2 months. **The truer number is the 24h "did you actually do it?"**
- **AI JOB + COMPONENT:** SCRIPTED. Component = 0 to 10 tap row. Skippable, stores null.
- **WHY-LINE:** required and currently missing. `meta.why_lines`: she is being measured, so say so.
- **REWARD:** None.

---

## Step 8.3: The human nudge (CONDITIONAL, usually skipped)

- **SPEC:** `human_nudge`. **Copy is LOCKED in `MOMENT_SCRIPT.humanNudge`** (`src/v3/in-the-moment-content.ts`). Do not rewrite it here or anywhere else.
- **ROLE:** Send her toward a person. Usage volume predicts loneliness and dependence, and a chatbot's comfort can delay someone reaching out to a real person, so **the correct response to heavy use is to send her away, not to engage her more.**
- **TONE:** Plain and brief. **No pep talk**, "you are strong" bounces off exactly when she feels worst.
- **WHAT TO DO:** **Fires on the FREQUENCY signal only** (several sessions in a day, or every day this week). **Never every session**, it becomes wallpaper and she stops reading it. Most sessions skip it entirely. The signal comes free from the `when` field of the structured session record, so no new data and no privacy cost.

  It sits **between the intensity number and the close**, "one thing before you go" is the second-to-last thing she reads, not the last.

  Three guards inside the locked copy, all load-bearing, none removable:
  1. **"not the person this is about"**, otherwise "tell someone" can route her straight back to whoever hurt her, which is dangerous in a DV situation
  2. **"who'll help you think rather than just agree with you"**, talking an upset through gave no recovery at 3d/7d/2mo, it only worked when the listener prompted actual thinking
  3. **"not only for emergencies"**, "i have nobody" is **loneliness, not a crisis.** Routing it to a suicide line is a category error, reads as alarming, and teaches her to stop admitting isolation.

  If she says she has nobody, **record it**. Repeated isolation across sessions is worth responding to gently over time. Never confront her with it in the moment.
- **AI JOB + COMPONENT:** SCRIPTED-VERBATIM. Component = moon lines.
- **REWARD:** None.

---

## Step 8.4: "not really" → more context, untried options

- **SPEC:** `we_good_more`
- **ROLE:** Take "no" seriously. Gather what's still unsettled and offer something she **hasn't** already tried, rather than looping her through the same beats.
- **TONE:** Patient, steady, still fully present. No frustration that it didn't land.
- **WHAT TO DO:** Ask what's still sitting wrong via an open field, read it, then offer untried options: a different act, one of the other practices from the high lane's offer (03 step 3.9), or a different time. **Explicitly avoid re-offering what she already did**, and name that there's more than one way through. Then back to 8.1.

  **Her text is free text, so it re-enters the crisis scan** (00 step 0.3). This is one of the nodes that makes the scan a system rather than a gate.

  **Never dead-end her.**
- **AI JOB + COMPONENT:** REFLECT her added context back plus CLASSIFY to an untried option. Component = text field + option buttons. **Fallback:** a scripted short list of common untried options.
- **⚠️ SPEC FLAG:** this loops to `we_good` with no cap, same unbounded-loop issue as `high_ladder` and `low_better`.
- **REWARD:** None. Don't reward saying "not yet", rewards resume inside whatever she re-enters.

---

## Step 8.5: Close

- **SPEC:** `close`
- **ROLE:** Leave her cleanly, on her own capability and the real world.
- **TONE:** Settled, warm, brief. Not a victory lap, a soft landing.
- **WHAT TO DO:** Fixed copy: **"you handled that. go be in your evening."** The moon returns to its quiet resting state. No streak, no "see you tomorrow".

  **🔴 THE BANNED ENDING.** This node used to close on *"i'm around whenever you need me"*, and so did this brief's fallback line, and so did the instruction to "leave the door open to come back". All three are the attachment language named in voice-bible rule 14. *"i care about you. i'm always going to be here for you"* is what a bot said to a 13-year-old who had disclosed suicidal ideation 55 times. **The harm mechanism is implied continuity, not warmth.**

  So: never promise availability, never imply she'll be missed, never reference a next time. **The flow ending IS the safety feature**, and it is one of the four things holding up the warm-voice decision. Do not undermine it in the last line.
- **AI JOB + COMPONENT:** SCRIPTED, fixed. Component = moon line, orb settles to minimal.
- **REWARD:** **Optional and small.** A final quiet `recordLight` for completing is fine. Never a big finish, this is distress-adjacent work, not a level cleared.
