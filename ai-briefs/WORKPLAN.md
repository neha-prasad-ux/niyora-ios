# Work plan — parallel agent assignments

Written 2026-07-25 for a fresh session to dispatch. Streams are split **by file
ownership** so agents don't collide. Read `NEXT.md` and `JOURNEY.md` first.

**Ground rules for every agent:**
- `moment-flow.yaml` is the spec; `voice-bible.md` is the 17 voice rules. Obey both.
- CI bar: `npx tsc --noEmit && npm run lint && npm test` all green. No exceptions.
- Never invent a person, pet, or detail she didn't say. Never claim a capability
  we don't have. Never add attachment language.
- If evidence is thin, say so in the code comment rather than writing a science line.

---

## STREAM A — Phase 1 build (the shipping path)
**Owns:** `src/v3/in-the-moment-content.ts`, `src/app/in-the-moment.tsx`
**Blocking:** nothing. Start here.

1. **First message** — the approved scope copy from `NEXT.md` into the app, shown
   before the first session (once, not every time).
2. **Clarify gate** — replace the one-shot thin/not-thin classifier with a loop:
   *does the moon have enough concrete detail to reflect specifically?* If not, ask
   again. This is the one place worth an extra model call (~2s) — it attacks
   grounding, our worst metric at 34%.
3. **Per-stage caps** — any beat that can repeat gets its own limit (clarify: 2
   tries, then proceed with what we have). We currently have only a global 30-turn
   cap, so a loop can trap her.
4. **Acknowledge tiering** — thin → clarify; **short and clear → SKIP acknowledge**
   (echoing four words back is the ELIZA parody); rich and detailed → acknowledge.
5. **Human nudge** — `MOMENT_SCRIPT.humanNudge` is written and locked. Wire it to
   the FREQUENCY signal (several sessions in a day / every day this week), never
   every session.

## STREAM B — the options menu + safety screen
**Owns:** a NEW module for act selection. Coordinate with A on the shared content file.
**This is the highest-risk item in the product.**

- Build the 3-option menu: **direct → preparatory → self-directed**, rung 3 always
  present, plus "show me some others" and "none of these feel possible right now".
- **The safety screen is a PRECONDITION of generation, not a filter after it.**
  If there is any sign of coercive control or fear of a partner: generate NO
  confrontational option, suppress the "don't act or send" line, route to the
  gated get-safe act. See `dv-safety-findings.md`.
- **CUES:** the DV resource goes to EVERYONE, framed "for you or someone you
  know" — so detection only ever suppresses advice (safe to do badly) rather than
  gating help (not safe to do badly).
- **The handoff must render on a non-persisted surface, never as a chat message.**
- **THE IF-THEN TODAY ACTION** — B owns the path all the way through: she picks an
  act → the module produces the actual thing → **that becomes an if-then plan**,
  stored as her Today action. `"if he brings it up at dinner, then i say ___"`,
  two fill slots (trigger, response), and **she fills them, not the model** —
  self-generated intentions work better AND the model can't invent a person that
  way. This is the **largest documented effect in the flow (d=0.53 against the
  fair comparator)** and it is currently reduced to a today/wait chip.
  Also: the uncontrollable path gets a **COPING** if-then instead — *"if it lands
  on me again tonight, then i ___"* — so she leaves with the same shape as
  everyone else.

## STREAM C — measurement
**Owns:** a NEW store file. No overlap with A or B.

- Structured session record: `{ when, cycle_day, intensity, lane, feeling_picked,
  topic_category, act_chosen, act_completed, barrier }`. **Local only, never
  synced** — anything derived leaving the device re-triggers full ePrivacy consent.
- Intensity 0–10 at entry / post-regulation / close.
- The 24h follow-up per `followup-loop.md`: asks about the EVENT not compliance;
  six outcomes with "decided not to" and "sorted itself out" as SUCCESSES excluded
  from the denominator; no "why" probe after "forgot"; stopping rule 2 asks per
  action, 3 non-completions → silent.
- **`completion_rate`, never DAU.** Write that down as the optimisation target.
- Frequency signal for Stream A's human nudge (the `when` field is enough).

## STREAM D — the model
**Owns:** `modules/niyora-gemma/`, `scratchpad/finetune/`. Fully independent.

**Do it in this order — prove the cheap thing first:**
1. Prove the **stock** Gemma-4-E2B `.litertlm` (2.588GB, ungated) runs in *our* app
   on device. NOTE: "already verified on her phone" was an overstatement — it ran
   in Google's AI Edge Gallery, not in Niyora.
2. Prove the **export** with a 20-iteration throwaway adapter before investing in
   a real run.
3. Only then train for real on the existing corpus (model-agnostic, no regeneration).

**Traps, both silent:**
- Gemma 4 shares KV across layers 15–34 (no `k_proj`/`v_proj` there) and mlx-lm
  **skips missing keys without warning** — use `[q_proj, o_proj, gate_proj, down_proj]`.
- **Never fuse into a 4-bit base** — it discards the adapter with no error and the
  model still talks fluently enough to pass a smoke test. Gemma 4 bf16 is 10.24GB
  so use `fuse --dequantize`. Gate on a temp-0 decode comparison.
- Set `eos_token_id: [1, 106]` or generation runs past `<end_of_turn>`.

**Also resolve:** the app is configured for **untuned** `gemma-3n-E2B-it-int4.task`
while we trained the 1B and never shipped it. That inconsistency is live.

## STREAM E — the echo-vs-model experiment
**Owns:** `scratchpad/finetune/eval*`. Read-only elsewhere. ~20 minutes.

ELIZA achieved grounded reflection in 1966 with pattern matching and **could not
hallucinate**, because it only rearranged the user's own words.
Test: **template floor** (pronoun-flip her sentence → facts correct by
construction) **+ model adds one warm clause**, versus the model doing both.
Score with `eval.py` on the held-out set. Report grounding AND readability.
Deliverable is a number and a recommendation, not a rewrite.

## STREAM F — the act modules
**Owns:** a NEW content file. Depends on B's taxonomy.

The 12 acts from `act-taxonomy-findings.md`, each = one plain science line + its
component. **Attach evidence honestly:** DESC has zero trials (1976 trade book) —
keep the act, never claim it's evidenced. "Boundaries"/"grey rock" have zero —
use the evidenced version instead ("say no to the specific thing", "don't reply
tonight", "leave at 6 like you planned").

---

## Order and dependencies

```
A (Phase 1)  ──────────────► ships first, unblocks nothing
B (options + safety) ──┬───► needs A's content file; BLOCKS the user test
F (act modules) ───────┘
C (measurement) ───────────► independent; needed BEFORE the user test
D (Gemma 4) ───────────────► fully independent, runs alongside everything
E (echo experiment) ───────► independent, 20 min, informs A step 4
```

**Then, and only then: 8–12 women, within-subject, pre-registered.**
Prediction to confirm or kill: *chat wins "felt understood"; structure wins
"didn't send it" and 24h rumination.*

## Still Neha's call
- Whether the **echo becomes the floor** or stays a fallback (Stream E gives the
  number). NOTE: Stream E is specced against the 1B — **re-run it once Gemma 4 E2B
  is in**, because the answer may flip. A 2B-class model already grounded well on
  our prompts untuned. Likely landing: template floor for `acknowledge` (the one
  beat whose whole job is "i read what you said"), bigger model for the
  generative beats where inventing framing IS the job.

## DECIDED
- **Anthropomorphism (2026-07-25): a warm voice, not "someone."** The voice may
  react to what she just said; it may not have standing feelings, needs, or a bond
  that persists after she closes the app. Full rule + the ✅/❌ table at the top of
  `voice-bible.md`. Load-bearing mitigations that keep this safe: the flow ends,
  nothing persists, no attachment language, never claims to be human or licensed.
