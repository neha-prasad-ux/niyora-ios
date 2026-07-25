# Per-step AI briefs — how to read these

One file per **phase** of the in-the-moment flow. Inside each file, one **brief per step**, in flow order. A brief is what makes a step runnable by the on-device moon (the ~1B model).

## The five fields

- **ROLE** — what this step is for; its job in the flow.
- **TONE** — how the moon sounds *here* (shifts with her state: gentler when flat, steadier when flooded, plainer when high).
- **WHAT TO DO** — the *direction* of what to say/ask: intent + constraints, not verbatim copy. **Exception:** safety/precision lines are given VERBATIM in quotes — ship those words exactly.
- **AI JOB + COMPONENT** — which of the 4 AI jobs fires (or SCRIPTED), the **scripted fallback** if the model is unavailable/low-confidence, and how the UI component is used.
- **REWARD** — whether the step rewards, and the moon's response (`recordLight`, tone-matched). "None" is a valid answer.

## Invariants (true in every brief — not repeated each time)

- **4 AI jobs only:** REFLECT (say her words back) · REFRAME (warm a *given* meaning) · DRAFT (write a message she edits+sends) · CLASSIFY (pick from the taxonomy). Everything else is SCRIPTED.
- **Copy model:** DIRECTION (scripted intent) + SENTENCE (AI-written). Safety/precision lines stay VERBATIM (crisis handoff, "in for four, out for six", "don't text him").
- **Every AI line has a scripted fallback.** The flow must run with the model off.
- **Voice = the moon:** warm, plain, California-30s, contractions, no clinical words, sentence case, ≤2 lines.
- **Guardrails:** no advice/next-step from the AI, no diagnosis, no "just hormones", no invented facts.
- **Reward = the moon's light** (`recordLight`), never points/confetti/streaks. Moon is minimal normally; blooms only for a reward or the breathe moment. Never gamify distress.
- **Drafts are never auto-sent.** She always edits + sends.

## Render model: this is a CHAT

The flow is presented as a conversation. **Moon speaks in left bubbles; she replies in right bubbles.** Every brief's "Component" resolves into this frame:

- **Moon line** — one (max two) short sentences in the moon's voice, rendered as a **left chat bubble**. The text is the SCRIPTED-or-AI-written slot. Lines accumulate as a transcript (see persistence, below).
- **Her input (chips / buttons / picker / checkboxes / text field)** — the input affordance renders inline; when she taps/answers, her choice **posts as a right bubble** so the exchange reads like a conversation, not a form. (CONFIRMED — "angry" tapped → "angry" appears as her turn.)
- **Two component surfaces, both in use — inline cards AND full-screen takeover** (CONFIRMED both needed):
  - **Inline cards** — chips, yes/no, checkboxes, short pickers, and lighter interactive widgets render in the chat stream as cards in/under the moon's bubble.
  - **Full-screen takeover** — the immersive moments (the 4:6 breathing orb, the 20-min timed break with corner clock) take over the screen, then drop a one-line summary back into the chat ("breathed with you · 4 rounds").
  - **The transition is a first-class surface, not a cut.** Entering and leaving a full-screen moment must feel smooth and continuous with the chat — the stream should breathe out into the moment and settle back in, never hard-snap. Treat the in↔full transition as something to design and tune, especially for the flooded/high-arousal entry into breathing.
- **Reward bloom** — `recordLight` rendered as the **moon avatar animating in place** — it lights/blooms right where it sits in the chat (left side), even as a small avatar (CONFIRMED). The light stays the moon's own, not a badge dropped in the stream.
- **Persistence — CONFIRMED: persist + draw a line.** The transcript stays after Close (it's just there, re-readable). The next in-the-moment session starts **fresh below a divider** — chat history with session breaks, not a wiped slate. She *can* scroll back to a past thread; that's an accepted tradeoff. The moon still keeps the thread in memory on top of the visible log.

## File order

- `00-entry.md` — raw entry, extraction, crisis scan, phase gate, intensity split
- `01-naming-beat.md` — acknowledge, offer feelings, name-it reward, feel-heard reflection
- (later) body check · arousal lanes (high/low/mixed) · Act 2 modules · time-it · we-good
