# Per-step AI briefs — how to read these

One file per **phase** of the in-the-moment flow. Inside each file, one **brief per step**, in flow order. A brief is what makes a step runnable by the on-device model.

**Which model that is, is not settled, and no brief should depend on the answer.** See "Model state" at the bottom before you write "the 1B" anywhere.

`moment-flow.yaml` is the single source of truth. Where a brief and the spec disagree, the spec wins.

## The five fields

- **ROLE** — what this step is for; its job in the flow.
- **TONE** — how the moon sounds *here* (shifts with her state: gentler when flat, steadier when flooded, plainer when high).
- **WHAT TO DO** — the *direction* of what to say/ask: intent + constraints, not verbatim copy. **Exception:** safety/precision lines are given VERBATIM in quotes — ship those words exactly.
- **AI JOB + COMPONENT** — which of the 4 AI jobs fires (or SCRIPTED), the **scripted fallback** if the model is unavailable/low-confidence, and how the UI component is used.
- **REWARD** — whether the step rewards, and the moon's response (`recordLight`, tone-matched). "None" is a valid answer.

## Invariants (true in every brief — not repeated each time)

- **4 AI jobs only:** REFLECT (say her words back) · REFRAME (warm a *given* meaning) · DRAFT (write a message she edits+sends) · CLASSIFY (pick from the taxonomy). Everything else is SCRIPTED.
- **Copy model:** DIRECTION (scripted intent) + SENTENCE (AI-written). Safety/precision lines stay VERBATIM (crisis handoff, "in for four, out for six", "don't act on this or send anything yet"). The don't-act line sits on **every** hold branch, not just the 20-minute one, and is **suppressed** where there are signs of coercive control: we do not know what waiting costs her in that house.
- **Every AI line has a scripted fallback.** The flow must run with the model off.
- **Voice = the moon:** warm, plain, California-30s, contractions, no clinical words, **all lowercase** (`voice-bible.md` rule 1), ≤2 lines.
- **Guardrails:** no advice/next-step from the AI, no diagnosis, no "just hormones", no invented facts, **no mechanism or physiology claims and no "research says"** (`voice-bible.md` rule 13). Where the reason is thin, give the plain reason instead of dressing it up.
- **Why-lines are required at every choice point.** ONE sentence above the chips saying what the choice is FOR her, in her language, never how it works in the brain. Never on a safety beat, and dropped once she has seen it ~3 times. `activity_context` was the only one the flow had; see `moment-flow.yaml` → `meta.why_lines` for the 16-item inventory.
- **The crisis scan runs on EVERY free-text message,** not only the entry, and never relaxes by cycle phase. Any node that takes typed input re-enters it. False positives are cheap; round up when uncertain.
- **Reward = the moon's light** (`recordLight`), never points/confetti/streaks. Moon is minimal normally; blooms only for a reward or the breathe moment. Never gamify distress.
- **Drafts are never auto-sent.** She always edits + sends.

## Render model: this is a CHAT

The flow is presented as a conversation. **Moon speaks in left bubbles; she replies in right bubbles.** Every brief's "Component" resolves into this frame:

- **Moon line** — one (max two) short sentences in the moon's voice, rendered as a **left chat bubble**. The text is the SCRIPTED-or-AI-written slot. Lines accumulate on screen for the length of the session only (see persistence, below).
- **Her input (chips / buttons / picker / checkboxes / text field)** — the input affordance renders inline; when she taps/answers, her choice **posts as a right bubble** so the exchange reads like a conversation, not a form. (CONFIRMED — "angry" tapped → "angry" appears as her turn.)
- **Two component surfaces, both in use — inline cards AND full-screen takeover** (CONFIRMED both needed):
  - **Inline cards** — chips, yes/no, checkboxes, short pickers, and lighter interactive widgets render in the chat stream as cards in/under the moon's bubble.
  - **Full-screen takeover** — the immersive moments (the 4:6 breathing orb, the 20-min timed break with corner clock) take over the screen, then drop a one-line summary back into the chat ("breathed with you · 4 rounds").
  - **The transition is a first-class surface, not a cut.** Entering and leaving a full-screen moment must feel smooth and continuous with the chat — the stream should breathe out into the moment and settle back in, never hard-snap. Treat the in↔full transition as something to design and tune, especially for the flooded/high-arousal entry into breathing.
- **Reward bloom** — `recordLight` rendered as the **moon avatar animating in place** — it lights/blooms right where it sits in the chat (left side), even as a small avatar (CONFIRMED). The light stays the moon's own, not a badge dropped in the stream.
- **Persistence: the transcript is EPHEMERAL. It is never written to disk.**
  > This bullet said *"CONFIRMED: persist + draw a line"* until 2026-07-25. **That decision is REVERSED.** Source of truth: `moment-flow.yaml` → `memory.transcript`. Reversing it cost nothing, because persistence was never built: `in-the-moment.tsx` performs zero writes, so ephemeral is already the shipped behaviour.

  Lines accumulate on screen while she is in the session and go when she closes it. There is no re-readable log, no divider between sessions, no scrolling back to a past thread, because there is no history. Nothing to erase, nothing to leak, nothing left in a backup or a crash log. Chayn state this unconditionally: don't auto-save on the user's end, she might be on a shared device. The first message promises it in her words: *"what you write stays on your phone and goes when you close it."*
  - **Not a mode, not a toggle.** A visible privacy switch is itself a signal, and a protection she has to find and turn on protects the people who need it least.
  - **What we keep instead** is a small structured record per session, enough for patterns and never quotable: `{ when, cycle_day, intensity, lane, feeling_picked, topic_category, act_chosen, act_completed, barrier }`. The moon holds the thread; she never gets a transcript of her worst moment. The structure is the privacy feature, not the encoding: `{topic: family_conflict, act: get_it_ready}` is innocuous on someone else's screen because it never contained the sentence.
  - **This is load-bearing safety, not a product preference.** The flow ENDING and nothing persisting are two of the four mitigations that make the warm-voice decision safe (with no attachment language, and never claiming to be human or licensed). If any of the four goes, that decision reopens: `voice-bible.md`, top section. It is also what settles the DV question: the handoff renders on a NON-PERSISTED surface, never as a chat message, so there is no written record that she looked up a service on a device someone else may control.

## File order

- `00-entry.md` — raw entry, extraction, crisis scan, phase gate, intensity split
- `01-naming-beat.md` — acknowledge, offer feelings, name-it reward, feel-heard reflection
- (later) body check · arousal lanes (high/low/mixed) · Act 2 modules · time-it · we-good

### ⚠️ The `00`–`08` briefs describe the PRE-CORRECTION flow. Do not build from them.

They are the most-read docs and the most wrong. `moment-flow.yaml` wins every disagreement. Known so far: `07-time-it.md` is wholly about the removed ~day-14 hold; `05-arousal-mixed.md` still teaches the removed `deweight` slot; `03-arousal-high.md` says "escalate up a fixed ladder" (renamed to an OFFER, *"want to try some other practices?"*) and carries a banned physiology line; `02-body-check.md` has no tired branch and defers everything to a Today action; `06-act2-modules.md` has no options menu and no gated act M; `08-we-good.md` has no intensity-out, no human nudge, and closes on banned attachment language; `01-naming-beat.md` forbids the naming-science beat the spec requires and has acknowledge always firing. WORKPLAN STREAM 0 owns rewriting or deleting them, and deleting is a legitimate answer.

## Model state (2026-07-25): do not write "the 1B" into a brief

- A LoRA **was trained** on `gemma-3-1b-it-4bit` and fused to bf16. **It never shipped.** Nothing tuned is on a phone.
- The app is **currently configured for an UNTUNED model**: `gemma-3n-E2B-it-int4.task`, 2.9GB, MediaPipe `.task` format, bundled in `modules/niyora-gemma`.
- The **target** is Gemma 4 E2B, a 2.588GB `.litertlm`. Different file **and a different loader** (LiteRT-LM, not MediaPipe), so it is a swap, not a config change.
- **One of the three has now generated a token inside Niyora (2026-07-25).** The bundled UNTUNED `gemma-3n-E2B-it-int4.task` did: on Neha's iPhone 15 (A16, iOS 26.5.2), `availability()` returned `available`, `prewarm()` returned true (17518ms cold, 696ms warm), and the model answered a smoke prompt ("The sky on a clear day is blue.") in 3421ms and 3693ms across two runs. MediaPipe was confirmed genuinely linked, not the `#if canImport` stub. Memory with the engine resident: 3030MB still available to the process, down from 3638MB. This was WORKPLAN Stream D step 0, and it PASSED. Before that date this bullet read "none of the three has been shown to generate a token inside Niyora", which was true then.
- **What that pass does NOT cover, and no brief may assume:** the TUNED 1B still has never been on a phone; **Gemma 4 E2B (`.litertlm`) still has not run in Niyora** (only in Google's AI Edge Gallery, a different app, and a different loader); output QUALITY, grounding, voice and safety were not tested at all (the prompt was trivial and non-clinical); the memory reading came from a probe screen, not a real session with the full UI; and the latency figures are ~10 output tokens on a 512-token budget, not a p50 or p95 for real turns.
- Consequence for briefs: **write no capability assumptions**. Every AI line keeps its scripted fallback, and the flow must run with the model off.
- The model is **never the arbiter of a crisis**, whichever one is running.
