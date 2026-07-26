# Work plan — parallel agent assignments

Written 2026-07-25 for a fresh session to dispatch. Streams are split **by file
ownership** so agents don't collide. Read `NEXT.md` and `JOURNEY.md` first.

| stream | owns | note |
|---|---|---|
| **A** · Phase 1 build | the engine + screen | first message, clarify gate, per-stage caps, acknowledge tiering, human nudge, **move the tired question to `time_it`** |
| **B** · options + safety screen | new selection module | **highest risk in the product — blocks the user test** |
| **C** · measurement | new store file | structured record, intensity 0–10, 24h follow-up, `completion_rate` never DAU |
| **D** · Gemma 4 | `modules/niyora-gemma` | fully independent; **runtime PROVEN on device 2026-07-25** (untuned `.task`, smoke prompt only), so: prove export → then train |
| **D2** · targeted tuning | corpus generation | contrastive pairs, hard cases, reweight acknowledge, actor-swap |
| **E** · echo experiment | eval only | ~20 min, produces a number that decides A's step 4 |
| **F** · act modules | new content file | the 12 acts, evidence attached honestly |
| **G** · **why-lines** | **copy, every file** | **the missing connective text. LAST — it collides with A/B/F** |

**Ground rules for every agent:**
- `moment-flow.yaml` is the spec; `voice-bible.md` is the 17 voice rules. Obey both.
- CI bar: `npx tsc --noEmit && npm run lint && npm test` all green. No exceptions.
- Never invent a person, pet, or detail she didn't say. Never claim a capability
  we don't have. Never add attachment language.
- If evidence is thin, say so in the code comment rather than writing a science line.

---

## 🔴 STREAM 0 — DOC RECONCILIATION. RUNS BEFORE EVERYTHING ELSE.
**Owns:** `ai-briefs/00-entry.md` … `08-we-good.md`, `_legend.md`,
`finetune-seed-fullflow.md`, `finetune-seed-high.md`, and the findings docs.
**Nothing else starts until this lands.** Agents dispatched onto contradictory
docs will build the contradiction.

A full sweep on 2026-07-25 found **~70 contradictions**. The critical ones inside
`moment-flow.yaml`, `voice-bible.md`, `NEXT.md` and `JOURNEY.md` are **already
fixed** — including the spec's `close` line, which was still the banned
attachment phrase *"i'm around whenever you need me"*, and the spec asserting in
two places that the transcript persists while a third said it's ephemeral.

**What Stream 0 must still do:**

1. **The eight step briefs (`00`–`08`) describe the PRE-CORRECTION flow.** They
   are the most-read docs and the most wrong. Specifically: `07-time-it.md` is
   wholly about the removed day-14 hold; `02-body-check.md` has no tired branch
   and defers everything to a Today action; `05-arousal-mixed.md` still teaches
   the removed `deweight`; `03-arousal-high.md` says "escalate up a fixed ladder"
   and carries the banned vagus-nerve line; `06-act2-modules.md` has no options
   menu, no gated act M, and requires "a real mechanism" line per module; `08` has
   no intensity-out and no human nudge, and closes on attachment language;
   `01-naming-beat.md` forbids the naming-science beat the spec requires and has
   acknowledge always firing. **Rewrite each against the spec, or delete them.**
   Deleting is a legitimate answer — they add nothing the spec doesn't have.
2. **`_legend.md:34` says persistence is "CONFIRMED: persist + draw a line."**
   Reversed. Also asserts the ~1B as the runtime model.
3. **`flow-methodology-check.md` GAP 1** still prescribes the controllability
   *routing* we rejected, and ranks it priority 1. Its GAP 2/3/4 are all done in
   the spec but nothing marks them closed.
4. **The seed files carry voice-bible violations** — prescribed crying, "research
   says", four phrasings from the REJECT column, "raw/tender/frazzled", and
   attachment closes. `generator-plan.md:46` points the corpus generator at them.

**BUT — verified 2026-07-25, do NOT take the seed files as proof of corpus rot.**
I checked the actual JSONL rather than inferring from the seeds. The generated
corpus is **much cleaner than the seeds**, because the gates caught most of it:

| pattern | in corpus |
|---|---|
| day-14 hold | **0** |
| attachment closes | **0** |
| "research says" | **0** |
| prescribed crying | **0** |
| "tell one person" | **0** |
| `deweight` slot | **120** ← real liability |
| vagus / "burns off the adrenaline" | **56** ← real liability |

So Stream D2 drops ~176 examples, not thousands. **Corpus total is 5,304**
(4,678 + 313 + 313, line-counted). The 5,367 figure elsewhere is the pre-gate
number; the 63-pair gap is exactly the `invented_person` gate.

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
   every session. **Verified 2026-07-25: it exists in the content file and is
   referenced ZERO times in `in-the-moment.tsx`.** It is written, not wired.
6. **Kill the "escalation ladder" framing in code.** Checked 2026-07-25: the five
   rungs themselves match the spec exactly (cold · move · fix-the-body · box-it ·
   accept-and-protect) — **the framing is what's stale.** The code still says
   `escalation ladder`, "escalate", "Ordered rungs", "Exhausting the ladder"
   (`in-the-moment-content.ts:322,429`, `in-the-moment.tsx:10,238`), and it
   escalates automatically with **no offer line**. The spec renamed this to an
   OFFER — `high_ladder.text` is *"want to try some other practices?"* — because
   "ladder" implies a hierarchy she is failing her way up, and because none of the
   five have trial evidence, so offering beats prescribing. Add the ask, rename
   the symbols and comments.

**Also true of the code, and correctly NOT yet built** (don't mistake these for
regressions): no intensity capture, no if-then, no after-fight checklist, no
why-lines. Those are Streams C, B, B and G.

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
- **Intensity 0–10 measured TWICE, not three times** — entry and close. The delta
  is the measure. The mid-flow "any better?" is a ROUTING question, not a
  measurement point; counting it as one was a spec mismatch (`moment-flow.yaml`
  → "INTENSITY, MEASURED TWICE"). Corrected 2026-07-25.
- The 24h follow-up per `followup-loop.md`: asks about the EVENT not compliance;
  six outcomes with "decided not to" and "sorted itself out" as SUCCESSES excluded
  from the denominator; no "why" probe after "forgot"; stopping rule 2 asks per
  action, 3 non-completions → silent.
- **`completion_rate`, never DAU.** Write that down as the optimisation target.
- Frequency signal for Stream A's human nudge (the `when` field is enough).

## STREAM D — the model
**Owns:** `modules/niyora-gemma/`, `scratchpad/finetune/`. Fully independent.

### ✅ STEP 0, THE GATE. **PASSED on device 2026-07-25.** Neha, 2026-07-25:
### "let's make sure we clear running on the phone first." We did. It runs.

**A token was generated on Neha's iPhone 15 (iPhone15,4, A16), iOS 26.5.2,
5687MB physical memory. Measured twice, in two separate runs.**

| thing | result |
|---|---|
| build | Debug, signed team `865S8DL9Y9`, installed to the device |
| entitlement | `com.apple.developer.kernel.increased-memory-limit` **present** in the built app's embedded entitlements, via a development profile regenerated 2026-07-25 after enabling "Increased Memory Limit" on the `com.niyora.app` App ID |
| MediaPipe really linked | **yes, not the `#if canImport` stub**: the `GemmaEngine` symbol (only defined inside the `canImport` branch) plus 788 `LlmInference` symbols in `Niyora.debug.dylib` |
| the model | in `Bundle.main`, 2991MB (3,136,226,711 bytes), not truncated |
| `availability()` | `available` |
| `prewarm()` | **true. 17518ms cold, 696ms on a subsequent load** |
| **a generated token** | prompt *"Reply with exactly one short sentence: what colour is the sky on a clear day?"* → **"The sky on a clear day is blue."** **3421ms** (run 1), **3693ms** (run 2) |
| memory | `os_proc_available_memory()`: **3638MB before prewarm, 3030MB with the engine resident.** The engine cost ~608MB of available memory, far less than the 2991MB file, so the weights are memory-mapped rather than fully charged to the app footprint |

**What this does NOT prove. Do not round any of it up:**
- It proves **`gemma-3n-E2B-it-int4` (`.task`, MediaPipe)** runs. It says nothing
  about **Gemma 4 E2B** (`.litertlm`), a different file AND a different loader,
  which has still only been seen in Google's AI Edge Gallery, never in Niyora.
- **Nothing TUNED has run on the phone.** The model that ran is untuned. The LoRA
  trained on Gemma-3-1B still has not shipped.
- **Nothing about output QUALITY, grounding, voice or safety was tested.** The
  prompt was a trivial non-clinical smoke prompt chosen only to prove tokens come
  out. This is not evidence about reflection quality.
- The 3030MB headroom was read in a probe screen, not in a real session with the
  full UI up. A real session is not yet proven to fit.
- Latency was ~10 output tokens on a 512-token context budget. It is not a p50 or
  a p95 for real turns.

**Kept for the record (this is what we believed before the test):** the gate was
open because installing a 3GB app is not the same as a token coming out, and
because the module compiles behind `#if canImport(MediaPipeTasksGenAI)` and would
have **silently become a stub** rather than failing loudly. That trap is real and
still applies to every future build. It was checked explicitly this time (see the
symbol count above) rather than assumed. Prior blockers now closed: `No Accounts`
signing, the missing Increased Memory Limit entitlement, and the "98% full, Gemma
parked" disk blocker (22GB free).

**Note which model this proves.** The bundled file is **`gemma-3n-E2B-it-int4`
(`.task`, MediaPipe)** — NOT Gemma 4 E2B (`.litertlm`), which is a different file
and a different loader. Passing this gate proved *the A16 can run a ~3GB on-device
model inside Niyora*, which was the real risk. Gemma 4 is now a swap, not a leap.

**Now unblocked, in order:**
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
while we trained the 1B and never shipped it. That inconsistency is live, and the
2026-07-25 pass does not close it: what generated a token on the phone was the
untuned model, on a trivial smoke prompt. Runtime is proven, tuning is not.

## STREAM D2 — TARGETED TUNING for grounding (do this BEFORE settling Stream E)
**Owns:** `scratchpad/finetune/` corpus generation. Runs with D.

**Correction to an earlier claim: "34% grounding is a capacity ceiling, not
fixable with more data" was an OVERSTATEMENT.** What we actually established is
that *general* data reached 34%. We never trained against the specific failure.
The corpus is 5,304 examples of GOOD outputs — all positive, all clean inputs,
nothing teaching the distinction the model keeps getting wrong.

### 🔴 FIRST: the corpus does not match the current flow. Audited 2026-07-25.

**Where it is:** `scratchpad/finetune/data/` — `train.jsonl` (4,678) + `valid`
(313) + `test` (313) = **5,304**, with parallel `.meta.jsonl` carrying a `slot`
tag per row. **That directory is session-temp.** A backup of the corpus, both
adapter sets and the scripts (64MB, minus the regenerable fused model) is at
`~/Claude Workspace/niyora/finetune-backup-2026-07-25`. **Work from the backup or
re-copy it somewhere durable before touching anything.**

The corpus is **slot-level, not traversal-level** — so structural changes (new
nodes, the intensity taps, the after-fight checklist, the tired move) do NOT
invalidate existing rows. Only slot removal or slot-content change does. Hence
the damage is bounded:

**Drop (~176 rows):**
- `deweight` — **120 examples for a node that no longer exists**
- ~56 rows carrying physiology claims ("burns off the adrenaline") — rule 13

**Not stale, just renamed** (do NOT regenerate these): `activity_context`→
`high_activity_context`, `cbt_stem`→`high_cbt_stem`, `check_read`→
`mixed_check_read`, `anchor`→`mixed_anchor`, `honor_real`→`mixed_real`.

**GENERATE FROM SCRATCH — four spec slots with ZERO examples:**

| slot | why it matters |
|---|---|
| `controllability` | the 3-act options menu — **the highest-risk component in the product**, the one that can generate "say it to him directly" into a house we know nothing about. Generate it WITH the safety screen as a precondition |
| `uncontrollable_honor` | |
| `uncontrollable_selfcompassion` | tone only, never a named technique |
| `uncontrollable_ifthen` | the coping if-then |

The last three are the whole "none of these feel possible" path. It was designed
after the corpus was built, so a woman on the flattest path has nothing behind her.

**AUDIT, don't assume:** the 723 `act2_module` rows predate the rule that *every
module ends in something she can do now*. Some likely end in insight. Sample them
and report a number before deciding whether to regenerate.

### 🔴 CORPUS FINDINGS FROM THE MODEL SESSION (2026-07-25) — act on these first

**1. `activity_context` breaks rule 13 in 36% of its targets.** 109 of 302 make a
physiology claim, almost all "adrenaline" — *"walking burns off the adrenaline
sitting in your chest"*. **DROP ALL 109 AND REGENERATE.**
This is worse than 109 bad rows: `activity_context` is the **prototype for all 19
why-lines**, the one node that already does the job. Train on it as-is and the
model learns *"say adrenaline whenever asked why something helps"*, and every
why-line inherits it. The why-lines note predicted exactly this trap — "explain
why" is the prompt that tempts a mechanism claim.
Regenerate under **register 1, not physiology**: the evidenced line here is
*"doing nothing for 20 minutes makes it worse"* (Bushman, N=600), which is about
stewing vs distraction and needs no body claim.

**2. The 637 Act 2 examples are architecturally obsolete. DROP ALL OF THEM.**
They train `module: real_hurt -> text`, and the architecture is now
act + topic + her text. **361 of the 637 carry no act and no module at all**, so
they are unusable regardless. Note the model session restored them and then
caught itself; both errors came from the same undefined handoff, not from
carelessness.

**3. `deweight` now maps to `None`, with the reasoning recorded.** Keep the
sentence that goes with it: *a deleted beat has no node, and the honest answer is
nothing, not a plausible neighbour.* That is the general rule for dead slots.

**4. 🔴 THE DRAFT ACTS ARE BLOCKED ON STREAM E, NOT ON MORE TUNING.**
Acts A, D and F produce **a message she actually sends to a real person**. Best
measured grounding is 54%, so roughly half would carry a detail she never said.
She edits before sending — but **an invented detail is precisely what she will
not catch**: it reads plausibly and it is about her own life.
This is a DESIGN fix, not an accuracy target to wait for. If the template floor
(Stream E) works anywhere it is here: build the message from her own sentences,
let the model add warmth, and the facts are correct by construction.

**5. DO NOT GENERATE FROM THE ACT MATRIX WHILE IT IS MARKED DRAFT.**
It encodes judgement about which acts a woman can reasonably take in which
situation. Baked into weights, that is far harder to see and undo than a table.
Neha corrects it first.

### Then the four reweighting changes:

1. **Contrastive pairs.** Same input, right vs wrong output, differing ONLY in who
   did what. We never showed the model a wrong answer beside a right one.
     her: "my partner made a comment about my cooking"
     ✅ "he made a comment about your cooking"   ❌ "you made a comment"
2. **Hard cases on purpose.** The corpus was generated to be good — clean inputs,
   unambiguous actors. Failures happen on messy ones: multiple people, ambiguous
   pronouns, nested clauses ("my sister told my mom the thing i asked her not to"
   — three actors, two pronouns). We have almost none.
3. **Reweight the beat that matters.** `acknowledge` is 877 of 5,304 (~17%) despite
   being the beat that decides whether she trusts the app. Try 40%.
4. **Actor-swap augmentation.** Generate a reversed-actor variant of every existing
   example. Doubles the actor-relevant signal for free.

**Then re-measure `ground.no_invention` on the held-out set.** If it reaches ~90%,
the model version likely wins on quality AND accuracy. If it plateaus near 60%,
the template floor is right. **Either way the decision comes from the number, not
from an assertion.**

## STREAM E — the echo-vs-model experiment
**Owns:** `scratchpad/finetune/eval*`. Read-only elsewhere. ~20 minutes.

ELIZA achieved grounded reflection in 1966 with pattern matching and **could not
hallucinate**, because it only rearranged the user's own words.
Test: **template floor** (pronoun-flip her sentence → facts correct by
construction) **+ model adds one warm clause**, versus the model doing both.
Score with `eval.py` on the held-out set. Report grounding AND readability.
Deliverable is a number and a recommendation, not a rewrite.

## STREAM G — WHY-LINES (the missing connective text)
**Owns:** copy only. Touches every content file, so **run it LAST or on a branch**
— it will collide with A, B and F if run alongside them.
**Neha, 2026-07-25: "the text to connect buttons (actions) to why is missing throughout."**

We ask her to choose at ~14 points and almost never say what the choice is FOR.
`activity_context` is the ONLY beat in the whole flow whose job is to explain why
an action helps. Everything else is bare chips she taps on trust.

**Why this is not cosmetic:** if she only learns "the app told me to breathe", she
has an app habit. If she learns "waiting 20 minutes is what stops me sending the
thing I'd take back", she has a skill that survives the phone going in her pocket.
Transfer is the point, and transfer needs the mechanism stated.

**The rule** (full version + the 16-item inventory in `moment-flow.yaml` → `meta.why_lines`):
- ONE sentence, above the chips, never inside them.
- What it does FOR HER, never how it works in the brain. **Voice-bible rule 13
  still binds** — no mechanism claims, no "research says", no physiology.
- Honest where evidence is thin: *"that's just sensible, not science."*
- **NEVER on the safety beats.** Crisis and safe-check stay verbatim and
  unexplained — an explanation there reads as persuasion, and we don't persuade
  her about her own safety.
- Fades after ~3 exposures. Teaching stops when she knows.

**Two of them are model slots, not scripted**, because they must name her actual
situation: the **3 act options** (she's choosing between direct / preparatory /
self-directed with nothing telling her what separates them) and the **if-then**
(the largest documented effect in the flow, currently a fill-in-the-blank with no
stated purpose). Add `why_line` to `voice-bible.md` slot jobs and to the corpus.

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
D2 (targeted tuning) ──────► runs with D; MUST finish before E is decided
E (echo experiment) ───────► independent, 20 min, informs A step 4
G (why-lines) ─────────────► LAST. touches every content file; collides with A/B/F
```

## The ending, settled (2026-07-25)

Verified against the spec by tracing `next:`/`branches:` — both branches converge.

**She picks an act:** options → the module produces the thing → **time it**
(tired-aware: *now or tomorrow?* is asked HERE, see below) → **if-then, she fills
both slots** (+ after-the-fight checklist, but only for acts that have an "after")
→ **we good?** → *not really* loops to "what's still sitting wrong" and offers
something untried → **intensity 0-10 out** → **human nudge** (frequency-gated
only) → **close**.

**She picks "none of these feel possible":** honor it, no arguing → warmth →
**one tiny comfort act** → **a COPING if-then** (*"if it lands on me again
tonight, then i ___"*) → door left open → then the same `we good?` → rating →
nudge → close.

Both branches deliver the same four things: something concrete, an if-then, a
check, an ending. The "none" path is a different aim, not a lesser flow.

~20 hours later, separately: the follow-up. *"decided not to"* and *"it sorted
itself out"* both count as **successes**.

**TIRED MOVED (Neha, 2026-07-25):** `body_tired` used to ask *now / tomorrow*.
It no longer does — at the body check she hasn't been regulated, hasn't seen the
options, and hasn't chosen an act, so it was asking her to time an action that
didn't exist yet. `body_tired` now just names the cost and sets `tired: true`;
**`time_it` asks the timing question**, where there's a specific thing to time.
Stream A owns this move.

⚠️ **`d = 0.91` is WRONG and keeps coming back.** The correct figure is
**d = 0.53**, against the fair comparator (goal intentions). 0.91 is against
no-regulation controls and overstates what we add. It has now been corrected in
three places — the spec, the diagram, and this plan. **If you see 0.91 in any doc,
it is stale.** Do not restore it.

**Then, and only then: 8–12 women, within-subject, pre-registered.**
Prediction to confirm or kill: *chat wins "felt understood"; structure wins
"didn't send it" and 24h rumination.*

## Still Neha's call
- Whether the **echo becomes the floor** or stays a fallback. **Do not settle this
  until D2 (targeted tuning) has run** — the 34% figure came from general data, not
  from data aimed at the failure. NOTE: Stream E is specced against the 1B — **re-run it once Gemma 4 E2B
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
