# Phase 00 — Entry

She arrives carrying something and types it raw. This phase reads what she wrote, checks she's safe, decides whether cycle-framing is even allowed, and picks the walk-down size. The moon barely speaks here — it's mostly listening and routing. See `_legend.md` for the field schema and invariants.

---

## Step 0.1 — Raw entry (the text field)

- **ROLE:** Give her one clean place to dump the thing, with zero friction and zero pre-judgment. This is the mouth of the whole flow.
- **TONE:** Silent-and-open. The moon isn't talking yet; the screen just feels safe to type into. No prompt that steers her toward a "right" kind of answer.
- **WHAT TO DO:** Offer an open text field with a soft, non-leading invite (direction: "what's going on?" energy — not "describe your emotion", not "rate your mood"). No character minimum, no forced structure. She can be messy, swear, ramble. Nothing else on screen competing for attention.
- **AI JOB + COMPONENT:** SCRIPTED (placeholder/invite is fixed copy). Component = single multiline text field, autofocus, keyboard up, one quiet submit. No AI runs *on* the field while she types — the model only reads after submit.
- **REWARD:** None. Rewarding the act of typing would gamify distress. The moon stays minimal.

---

## Step 0.2 — Extraction (issue + candidate feelings + intensity)

- **ROLE:** Turn her raw text into the three things the rest of the flow routes on: the **issue** (what happened), **candidate feelings** (from the taxonomy), and **intensity** (big vs small). Invisible to her.
- **TONE:** N/A — nothing is shown. No "analyzing…" theater, no spinner that implies she's being scored.
- **WHAT TO DO:** Parse silently. Pull a short issue summary, 3 candidate feelings ranked, and an intensity read. Hold these for later steps (feelings feed the Naming Beat's offer; intensity feeds 0.5; feeling feeds arousal-lane routing). Do **not** surface any of it yet — she names her own feeling in 01, the model doesn't announce it.
- **AI JOB + COMPONENT:** CLASSIFY (map text → taxonomy feelings + intensity). No component. **Fallback:** if the model is unavailable or low-confidence, fall back to a scripted 3-feeling offer in 01 (a safe generic triad) and treat intensity as BIG (safer to over-serve regulation than skip it). Never block the flow on extraction.
- **REWARD:** None.

---

## Step 0.3 — Tiered crisis scan (safety, runs on the raw text)

- **ROLE:** Catch genuine risk before anything else happens. This is a safety gate, not a feature. The 1B is **never** the arbiter of a hard handoff — the *scan* can flag, but the *response* is scripted and fixed.
- **TONE:** Calm, plain, unhurried. No alarm, no drama, no clinical distance. If it speaks, it speaks like someone steady who isn't scared of the sentence.
- **WHAT TO DO:** Three tiers, matched to what the text actually shows:
  - **Venting hyperbole** ("I could kill him", "I want to die of embarrassment") → treat as nothing. Do **not** interrupt the flow. Continue normally.
  - **Ambiguous hopelessness** (vague "what's the point", "I can't do this anymore" with no plan) → one soft, non-clinical check, VERBATIM: **"are you safe right now?"** — then branch on her answer (safe → resume flow; not-safe → escalate to the hard tier).
  - **Explicit intent / plan / means** → **hard handoff, scripted and verbatim.** Stop the emotional flow. Show the crisis-support handoff exactly as written in the safety spec (resources + warm line). The model does **not** compose, soften, or improvise here.
- **AI JOB + COMPONENT:** CLASSIFY (which tier the text falls in) → then SCRIPTED-VERBATIM for every line shown. **Fallback:** if the classifier is uncertain between tiers, round **up** (serve the softer check rather than skip it). If the model is fully unavailable, the scan defaults to showing the soft "are you safe right now?" only on explicit high-risk keyword hits (scripted keyword backstop) so safety never depends on the model being on. Component = full-screen scripted card for the hard tier; inline soft line for the ambiguous tier.
- **REWARD:** None. Never reward or "light up" around distress or a safety moment.

---

## Step 0.4 — Gate 1: phase (PMS vs normal → framing on/off)

- **ROLE:** Decide whether cycle-framing is *allowed* to be used downstream. This is a **safety rule**, not a flavor choice: on a normal (non-luteal) day, nothing in the flow may blame her cycle for how she feels.
- **TONE:** N/A here (silent gate). Its *effect* on tone shows up later — luteal lets the moon gently name the phase as context; normal-day forbids it entirely.
- **WHAT TO DO:** Read cycle data. If she's in the PMS/luteal window → framing **ON** (later steps may offer phase-as-context, never phase-as-dismissal). If normal day / no cycle signal → framing **OFF**: **no cycle-blame, ever**, and never invent a phase. Set a single flag the downstream modules read.
- **AI JOB + COMPONENT:** SCRIPTED (deterministic from cycle data — not a model decision). No component. **Fallback:** if cycle data is missing/uncertain, default framing **OFF** (safer to not blame the cycle than to wrongly blame it). The "just hormones" guardrail applies in both states — framing ON still never means dismissal.
- **REWARD:** None.

---

## Step 0.5 — Intensity split (BIG → full walk-down · SMALL → skip regulation)

- **ROLE:** Right-size the flow to what she's actually carrying. A big emotion earns the full regulation walk-down; a small one shouldn't be dragged through machinery it doesn't need.
- **TONE:** Matches the size. Big → steady and containing. Small → light, unbothered, a touch of "we don't need to make this a thing."
- **WHAT TO DO:** Branch on the intensity read from 0.2:
  - **BIG emotion** → full walk-down: proceed into the Naming Beat (01) and on to body check + arousal lanes.
  - **SMALL emotion** → skip regulation. Brief acknowledge / "heard you" → jump to **Act 2** (explore how she handles it). If there's genuinely nothing to handle → offer the **"close, let it pass"** exit (direction: name that it's small, that letting it move through is fine, no obligation to process).
- **AI JOB + COMPONENT:** SCRIPTED routing on the classified intensity; the brief acknowledge line is REFLECT (one line, her situation back) with a scripted fallback ("heard you — that one's real, even if it's small"). Component = the router itself + one moon line for the small-path acknowledge. **Fallback:** if intensity is ambiguous, route **BIG** (over-serving regulation is safe; under-serving it isn't).
- **REWARD:** None yet on the BIG path (reward lands at the naming beat). On the SMALL "let it pass" exit, a small, quiet light is okay — affirming that she checked in at all, not that she was distressed.
